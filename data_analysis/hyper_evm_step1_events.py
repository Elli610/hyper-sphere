"""
Module: hyper_evm_step1_events.py

But: helpers d'enrichissement + API FastAPI pour Hyper EVM (propre & minimal)
- Tagging des events
- Flux (from → to)
- Séries temporelles (tx, gaz)
- API avec export JSON/CSV/Parquet
- Chargement DB (PostgreSQL via SQLAlchemy)

Dépendances: pandas, fastapi, uvicorn, sqlalchemy, psycopg2-binary, python-dotenv
Optionnel pour Parquet API: pyarrow
"""

from __future__ import annotations
import io
import os
import zipfile
from typing import Any, Tuple

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from sqlalchemy import create_engine, text

# =============================
# Signatures & Sélecteurs
# =============================
SIG = {
    # ERC-20 & ERC-721 (Transfer)
    "TRANSFER": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    # Approval(address,address,uint256)
    "APPROVAL": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0",
    # ApprovalForAll(address,address,bool)
    "APPROVAL_FOR_ALL": "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31",
    # ERC-1155 TransferSingle/Batch
    "ERC1155_TRANSFER_SINGLE": "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
    "ERC1155_TRANSFER_BATCH":  "0x4a39dc06d4c0dbc64b70d2998399d2fee9be3b0d6e7dafa9a3dbe3e6b06d3d56",
}

SELECTOR_MAP = {
    "0xa9059cbb": "transfer(address,uint256)",
    "0x23b872dd": "transferFrom(address,address,uint256)",
    "0x095ea7b3": "approve(address,uint256)",
    "0x70a08231": "balanceOf(address)",
    "0xdd62ed3e": "allowance(address,address)",
}

# =============================
# Utils
# =============================

def _is_hex(x: Any) -> bool:
    return isinstance(x, str) and x.startswith("0x")


def hex_to_int(x: Any) -> int | None:
    if x is None:
        return None
    if isinstance(x, int):
        return x
    if isinstance(x, str):
        try:
            return int(x, 16) if x.startswith('0x') else int(x)
        except Exception:
            return None
    return None


def _to_int_maybe(x: Any) -> int | None:
    if isinstance(x, int):
        return x
    if isinstance(x, str):
        try:
            return int(x, 16) if x.startswith('0x') else int(x)
        except Exception:
            return None
    return None


def to_datetime_utc(col: pd.Series) -> pd.Series:
    """Convertit robustement un champ timestamp (epoch seconds, iso, datetime) → datetime64[ns, UTC]."""
    s1 = pd.to_datetime(col, unit='s', utc=True, errors='coerce')
    if s1.notna().any() and s1.isna().mean() < 0.5:
        # majoritairement des secondes epoch
        return s1
    # sinon, tente conversion générique
    return pd.to_datetime(col, utc=True, errors='coerce')


def short_hex(x: Any, left: int = 6, right: int = 4):
    if not isinstance(x, str) or not x.startswith('0x'):
        return x
    if len(x) <= 2 + left + right:
        return x
    return f"{x[:2+left]}…{x[-right:]}"


def topic_to_address(topic: Any) -> str | None:
    if not isinstance(topic, str) or not topic.startswith('0x'):
        return None
    h = topic[2:].rjust(64, '0')
    return '0x' + h[-40:]

# =============================
# Tagging
# =============================

def label_events_basic(logs: pd.DataFrame, out_col: str = 'tradution_event') -> pd.DataFrame:
    df = logs.copy()
    mapper = {
        SIG['ERC1155_TRANSFER_SINGLE']: 'single_tx',
        SIG['ERC1155_TRANSFER_BATCH']:  'batch_tx',
        SIG['APPROVAL']:                'approval',
        SIG['APPROVAL_FOR_ALL']:        'approval_for_all',
        SIG['TRANSFER']:                'transfer',
    }
    s = df['topic0'].str.lower()
    df[out_col] = s.map(mapper).fillna('other')
    has_t3 = df.get('topic3').astype(str).str.startswith('0x', na=False) if 'topic3' in df.columns else False
    df.loc[df[out_col].eq('transfer') & has_t3, out_col] = 'erc721_transfer'
    df.loc[df[out_col].eq('transfer') & ~has_t3, out_col] = 'erc20_transfer'
    return df


def tag_events_simple(logs: pd.DataFrame) -> pd.DataFrame:
    df = logs.copy()
    def _etype(row) -> str:
        sig = row.get('topic0')
        sig = sig.lower() if isinstance(sig, str) else None
        if sig == SIG['TRANSFER']:
            return 'erc721_transfer' if _is_hex(row.get('topic3')) else 'erc20_transfer'
        if sig == SIG['APPROVAL']:
            return 'approval'
        if sig == SIG['APPROVAL_FOR_ALL']:
            return 'approval_for_all'
        if sig == SIG['ERC1155_TRANSFER_SINGLE']:
            return 'erc1155_transfer_single'
        if sig == SIG['ERC1155_TRANSFER_BATCH']:
            return 'erc1155_transfer_batch'
        return 'other'
    df['event_type'] = df.apply(_etype, axis=1)
    df['is_token_transfer'] = df['event_type'].str.contains('transfer', na=False)
    return df


def label_tx_methods_basic(txs: pd.DataFrame, out_col: str = 'method_name') -> pd.DataFrame:
    df = txs.copy()
    def _sel(x):
        if isinstance(x, str) and x.startswith('0x') and len(x) >= 10:
            return x[:10].lower()
        return None
    if 'input_data' in df.columns:
        df['method_selector'] = df['input_data'].apply(_sel)
        df[out_col] = df['method_selector'].map(SELECTOR_MAP)
        mask_no_input = df['input_data'].isin(['0x', '0x0', '', None])
        df.loc[df[out_col].isna() & mask_no_input, out_col] = 'no_input'
        df[out_col] = df[out_col].fillna('unknown')
    else:
        df['method_selector'] = None
        df[out_col] = 'unknown'
    return df

# =============================
# Flows & Timeseries
# =============================

def build_token_flows_basic(events: pd.DataFrame) -> pd.DataFrame:
    if 'event_type' not in events.columns:
        events = tag_events_simple(events)
    df = events[events['event_type'].isin([
        'erc20_transfer', 'erc721_transfer', 'erc1155_transfer_single', 'erc1155_transfer_batch'
    ])].copy()
    def _from(row):
        et = row['event_type']
        if et in ('erc20_transfer', 'erc721_transfer'):
            return topic_to_address(row.get('topic1'))
        if et.startswith('erc1155_'):
            return topic_to_address(row.get('topic2'))
        return None
    def _to(row):
        et = row['event_type']
        if et in ('erc20_transfer', 'erc721_transfer'):
            return topic_to_address(row.get('topic2'))
        if et.startswith('erc1155_'):
            return topic_to_address(row.get('topic3'))
        return None
    df['from'] = df.apply(_from, axis=1)
    df['to'] = df.apply(_to, axis=1)
    df['token_address'] = df.get('address')
    flows = df[['transaction_hash','token_address','from','to']].dropna(subset=['from','to']).reset_index(drop=True)
    flows['from_short'] = flows['from'].map(short_hex)
    flows['to_short'] = flows['to'].map(short_hex)
    flows['token_short'] = flows['token_address'].map(short_hex)
    return flows


def build_token_flows_with_amounts(events: pd.DataFrame, token_decimals: pd.DataFrame | None = None) -> pd.DataFrame:
    if 'event_type' not in events.columns:
        events = tag_events_simple(events)
    df = events[events['event_type'].isin([
        'erc20_transfer', 'erc721_transfer', 'erc1155_transfer_single', 'erc1155_transfer_batch'
    ])].copy()
    def _from(row):
        et = row['event_type']
        if et in ('erc20_transfer', 'erc721_transfer'):
            return topic_to_address(row.get('topic1'))
        if et.startswith('erc1155_'):
            return topic_to_address(row.get('topic2'))
        return None
    def _to(row):
        et = row['event_type']
        if et in ('erc20_transfer', 'erc721_transfer'):
            return topic_to_address(row.get('topic2'))
        if et.startswith('erc1155_'):
            return topic_to_address(row.get('topic3'))
        return None
    df['from'] = df.apply(_from, axis=1)
    df['to'] = df.apply(_to, axis=1)
    df['token_address'] = df.get('address')
    df['token_id'] = None
    df['amount_raw'] = None
    df['amount_token'] = None
    df['is_batch'] = False
    for i, row in df.iterrows():
        et = row['event_type']
        if et == 'erc20_transfer':
            df.at[i, 'amount_raw'] = hex_to_int(events.loc[row.name, 'data'])
        elif et == 'erc721_transfer':
            df.at[i, 'token_id'] = hex_to_int(events.loc[row.name, 'topic3'])
            df.at[i, 'amount_raw'] = 1
            df.at[i, 'amount_token'] = 1.0
        elif et == 'erc1155_transfer_single':
            data_hex = events.loc[row.name, 'data']
            if isinstance(data_hex, str) and data_hex.startswith('0x'):
                h = data_hex[2:].rjust(64*2, '0')
                try:
                    token_id = int(h[:64], 16)
                    value = int(h[64:128], 16)
                    df.at[i, 'token_id'] = token_id
                    df.at[i, 'amount_raw'] = value
                except Exception:
                    pass
        elif et == 'erc1155_transfer_batch':
            df.at[i, 'is_batch'] = True
    if token_decimals is not None and {'token_address','decimals'}.issubset(token_decimals.columns):
        meta = token_decimals[['token_address','decimals']].drop_duplicates().copy()
        meta['token_address'] = meta['token_address'].str.lower()
        out = df.merge(meta, left_on=df['token_address'].str.lower(), right_on='token_address', how='left')
        out['amount_token'] = out.apply(
            lambda r: (float(r['amount_raw']) / (10 ** int(r['decimals'])))
            if pd.notna(r.get('decimals')) and pd.notna(r.get('amount_raw')) and r['event_type']=='erc20_transfer'
            else r.get('amount_token')
        , axis=1)
        out.drop(columns=['key_0','token_address_y'], errors='ignore', inplace=True)
        out.rename(columns={'token_address_x':'token_address'}, inplace=True)
        df = out
    return df[['transaction_hash','block_number','token_address','event_type','from','to','token_id','amount_raw','amount_token','is_batch']]


def prepare_tx_timeseries(blocks: pd.DataFrame, txs: pd.DataFrame, freq: str = 'h') -> pd.DataFrame:
    b = blocks[['number','timestamp']].copy()
    b['number'] = b['number'].apply(_to_int_maybe)
    b['timestamp_dt'] = to_datetime_utc(b['timestamp'])
    t = txs[['hash','block_number']].copy()
    t['block_number'] = t['block_number'].apply(_to_int_maybe)
    m = t.merge(b[['number','timestamp_dt']], left_on='block_number', right_on='number', how='left')
    s = (m.set_index('timestamp_dt').sort_index().resample(freq)['hash'].count().rename('tx_count').to_frame())
    return s


def prepare_gas_timeseries(blocks: pd.DataFrame, freq: str = 'h') -> pd.DataFrame:
    b = blocks[['number','timestamp','gas_used','gas_limit','base_fee_per_gas']].copy()
    b['timestamp_dt'] = to_datetime_utc(b['timestamp'])
    for col in ['gas_used','gas_limit','base_fee_per_gas']:
        b[col] = b[col].apply(hex_to_int)
    b['gas_used_pct'] = (b['gas_used'] / b['gas_limit']).clip(lower=0, upper=1)
    b['base_fee_gwei'] = b['base_fee_per_gas'] / 1e9
    g = (b.set_index('timestamp_dt').sort_index().resample(freq)
           .agg(block_count=('number','count'),
                gas_used_sum=('gas_used','sum'),
                gas_used_pct_avg=('gas_used_pct','mean'),
                base_fee_gwei_avg=('base_fee_gwei','mean')))
    return g


def _attach_block_time(df: pd.DataFrame, blocks: pd.DataFrame) -> pd.DataFrame:
    b = blocks[['number','timestamp']].copy()
    b['number'] = b['number'].apply(hex_to_int)
    b['timestamp_dt'] = to_datetime_utc(b['timestamp'])
    out = df.copy()
    if 'block_number' in out.columns:
        out['block_number'] = out['block_number'].apply(hex_to_int)
        out = out.merge(b[['number','timestamp_dt']], left_on='block_number', right_on='number', how='left')
        out.drop(columns=['number'], inplace=True)
    return out


def build_transfer_counts_timeseries(events: pd.DataFrame, blocks: pd.DataFrame, freq: str = 'h') -> pd.DataFrame:
    if 'event_type' not in events.columns:
        events = tag_events_simple(events)
    e = events[events['event_type'].str.contains('transfer', na=False)].copy()
    e = _attach_block_time(e, blocks)
    ts = (e.set_index('timestamp_dt').sort_index().resample(freq).size().rename('transfer_event_count').to_frame())
    return ts

# =============================
# API Helpers
# =============================

def _df_time_to_iso(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if df.index.name and 'time' in str(df.index.name).lower():
        df = df.reset_index()
    for c in df.columns:
        if str(df[c].dtype).startswith('datetime64'):
            df[c] = df[c].dt.tz_convert('UTC').dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    return df


def _validate_freq(freq: str) -> str:
    f = (freq or '').lower()
    valid = {'h','d','15min','30min','w'}
    if f not in valid:
        raise HTTPException(status_code=400, detail=f"freq invalide. Choisir parmi {sorted(valid)}")
    return f


def _respond_df(df: pd.DataFrame, fmt: str = 'json', filename: str = 'data'):
    fmt = (fmt or 'json').lower()
    if fmt == 'json':
        return JSONResponse(df.to_dict(orient='records'))
    if fmt == 'csv':
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(iter([buf.getvalue()]), media_type='text/csv', headers={
            'Content-Disposition': f'attachment; filename="{filename}.csv"'
        })
    if fmt == 'parquet':
        try:
            import pyarrow as pa, pyarrow.parquet as pq
        except Exception:
            raise HTTPException(status_code=400, detail='Parquet requiert pyarrow (pip install pyarrow)')
        buf = io.BytesIO()
        table = pa.Table.from_pandas(df)
        pq.write_table(table, buf)
        buf.seek(0)
        return StreamingResponse(buf, media_type='application/octet-stream', headers={
            'Content-Disposition': f'attachment; filename="{filename}.parquet"'
        })
    raise HTTPException(status_code=400, detail='fmt invalide. Utilisez json, csv, ou parquet')


def _build_export_zip(blocks: pd.DataFrame, txs: pd.DataFrame, events: pd.DataFrame, freq: str = 'h') -> bytes:
    ts_tx = prepare_tx_timeseries(blocks, txs, freq)
    ts_gas = prepare_gas_timeseries(blocks, freq)
    ts_evt = build_transfer_counts_timeseries(events, blocks, freq)
    tagged = tag_events_simple(events)
    flows_basic = build_token_flows_basic(tagged)
    top_tokens = top_tokens_by_events(flows_basic, top_k=50)
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f'activity_tx_{freq}.csv', ts_tx.to_csv())
        zf.writestr(f'activity_gas_{freq}.csv', ts_gas.to_csv())
        zf.writestr(f'activity_transfers_{freq}.csv', ts_evt.to_csv())
        zf.writestr('top_tokens.csv', top_tokens.to_csv(index=False))
    mem.seek(0)
    return mem.read()

# =============================
# API Factory (DataFrames en mémoire)
# =============================

def create_api_app(events: pd.DataFrame, txs: pd.DataFrame, blocks: pd.DataFrame, token_decimals: pd.DataFrame | None = None) -> FastAPI:
    app = FastAPI(title='Hyper EVM API', version='0.2.0')
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'], allow_credentials=True,
        allow_methods=['*'], allow_headers=['*']
    )

    @app.get('/')
    def root():
        return RedirectResponse(url='/docs')

    @app.get('/favicon.ico')
    def favicon():
        return JSONResponse(status_code=204, content={})

    @app.get('/health')
    def health():
        return {'ok': True}

    @app.get('/info')
    def info():
        return {
            'events_rows': int(len(events)),
            'tx_rows': int(len(txs)),
            'blocks_rows': int(len(blocks)),
            'cols': {
                'events': list(events.columns),
                'txs': list(txs.columns),
                'blocks': list(blocks.columns),
            }
        }

    @app.get('/events/types')
    def events_types(fmt: str = 'json'):
        tagged = tag_events_simple(events)
        vc = tagged['event_type'].value_counts().rename_axis('event_type').reset_index(name='count')
        return _respond_df(vc, fmt=fmt, filename='events_types')

    @app.get('/tx/timeseries')
    def tx_timeseries(freq: str = 'h', fmt: str = 'json'):
        f = _validate_freq(freq)
        ts = prepare_tx_timeseries(blocks, txs, f)
        df = _df_time_to_iso(ts) if (fmt or 'json').lower() == 'json' else ts.reset_index()
        return _respond_df(df, fmt=fmt, filename=f'tx_timeseries_{f}')

    @app.get('/gas/timeseries')
    def gas_timeseries(freq: str = 'h', fmt: str = 'json'):
        f = _validate_freq(freq)
        ts = prepare_gas_timeseries(blocks, f)
        df = _df_time_to_iso(ts) if (fmt or 'json').lower() == 'json' else ts.reset_index()
        return _respond_df(df, fmt=fmt, filename=f'gas_timeseries_{f}')

    @app.get('/flows/basic')
    def flows_basic(top: int = 30, fmt: str = 'json'):
        tagged = tag_events_simple(events)
        flows = build_token_flows_basic(tagged)
        agg = (flows.groupby(['from','to']).size().reset_index(name='count')
                    .sort_values('count', ascending=False).head(top))
        return _respond_df(agg, fmt=fmt, filename='flows_basic')

    @app.get('/tokens/top')
    def tokens_top(k: int = 10, fmt: str = 'json'):
        tagged = tag_events_simple(events)
        flows = build_token_flows_basic(tagged)
        top = top_tokens_by_events(flows, top_k=k)
        return _respond_df(top, fmt=fmt, filename='tokens_top')

    @app.get('/flows/amounts')
    def flows_amounts(top: int = 30, fmt: str = 'json'):
        tagged = tag_events_simple(events)
        flows = build_token_flows_with_amounts(tagged, token_decimals)
        agg = (flows.dropna(subset=['from','to'])
                   .groupby(['token_address','from','to'])
                   .agg(events=('transaction_hash','count'), amount_raw_sum=('amount_raw','sum'))
                   .reset_index()
                   .sort_values(['events','amount_raw_sum'], ascending=[False, False])
                   .head(top))
        return _respond_df(agg, fmt=fmt, filename='flows_amounts')

    @app.get('/export.zip')
    def export_zip(freq: str = 'h'):
        f = _validate_freq(freq)
        data = _build_export_zip(blocks, txs, events, f)
        return StreamingResponse(io.BytesIO(data), media_type='application/zip', headers={'Content-Disposition': 'attachment; filename="hyper_evm_export.zip"'})

    return app

# =============================
# Intégration PostgreSQL
# =============================

def make_pg_engine_from_env(prefix: str = "PG"):
    user = os.getenv(f"{prefix}_USER")
    pwd  = os.getenv(f"{prefix}_PASSWORD")
    host = os.getenv(f"{prefix}_HOST", "localhost")
    port = os.getenv(f"{prefix}_PORT", "5432")
    db   = os.getenv(f"{prefix}_DB")
    if not all([user, pwd, db]):
        raise RuntimeError("Variables d'env manquantes: PG_USER, PG_PASSWORD, PG_DB (PG_HOST/PG_PORT facultatives)")
    url = f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}"
    return create_engine(url)


def load_frames_from_db(engine, *,
                        tx_query: str = "SELECT * FROM transactions",
                        blocks_query: str = "SELECT * FROM blocks",
                        events_query: str = "SELECT * FROM event_logs") -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    df_tx = pd.read_sql(text(tx_query), engine)
    data_blocks = pd.read_sql(text(blocks_query), engine)
    data_event = pd.read_sql(text(events_query), engine)
    return df_tx, data_blocks, data_event


def create_api_app_from_db(engine=None, *,
                           tx_query: str = "SELECT * FROM transactions",
                           blocks_query: str = "SELECT * FROM blocks",
                           events_query: str = "SELECT * FROM event_logs",
                           token_decimals: pd.DataFrame | None = None, env_prefix: str = "PG") -> FastAPI:
    if engine is None:
        engine = make_pg_engine_from_env(prefix=env_prefix)
    df_tx, data_blocks, data_event = load_frames_from_db(engine, tx_query=tx_query, blocks_query=blocks_query, events_query=events_query)
    return create_api_app(data_event, df_tx, data_blocks, token_decimals)

# =============================
# Runner (optionnel) — permet `python hyper_evm_step1_events.py`
# =============================
if __name__ == "__main__":
    # Démarrage rapide en lisant .env et en exposant l'API
    from dotenv import load_dotenv
    import uvicorn
    load_dotenv()
    app = create_api_app_from_db()
    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8000")))
