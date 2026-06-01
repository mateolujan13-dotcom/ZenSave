import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

Path('backend/logs').mkdir(exist_ok=True)

logger = logging.getLogger('zensave')
logger.setLevel(logging.INFO)
fmt = logging.Formatter('[%(asctime)s] %(levelname)-8s %(message)s', '%Y-%m-%d %H:%M:%S')
fh = RotatingFileHandler('backend/logs/zensave.log', maxBytes=5_000_000, backupCount=3)
fh.setFormatter(fmt)
logger.addHandler(fh)

console = logging.StreamHandler()
console.setFormatter(fmt)
logger.addHandler(console)
