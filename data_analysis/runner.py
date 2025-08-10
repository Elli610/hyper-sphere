from dotenv import load_dotenv
load_dotenv()  # charge les variables PG_* depuis .env

import os
from hyper_evm_step1_events import create_api_app_from_db

# Requêtes par défaut (tu peux aussi les définir via variables d'env si tu veux affiner)
TX_QUERY     = os.getenv("TX_QUERY",     "SELECT * FROM transactions")
BLOCKS_QUERY = os.getenv("BLOCKS_QUERY", "SELECT * FROM blocks")
EVENTS_QUERY = os.getenv("EVENTS_QUERY", "SELECT * FROM event_logs")

# Fabrique l'app FastAPI en chargeant un snapshot depuis la DB au démarrage
app = create_api_app_from_db(
    tx_query=TX_QUERY,
    blocks_query=BLOCKS_QUERY,
    events_query=EVENTS_QUERY,
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("runner:app", host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8000")), reload=True)
