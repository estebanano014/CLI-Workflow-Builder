"""Punto de entrada del núcleo Python.

Espera por variables de entorno:
  CLI_WF_TOKEN      -> token efímero de autorización.
  CLI_WF_PORT       -> puerto (0 = efímero, el real se imprime como CLI_WF_READY <port>).
  CLI_WF_DATA_DIR   -> carpeta de datos (contiene datos_flujos.json).
"""
import os

from app.server import run


def main():
    token = os.environ.get("CLI_WF_TOKEN", "")
    port = int(os.environ.get("CLI_WF_PORT", "0"))
    data_dir = os.environ.get("CLI_WF_DATA_DIR", "./data")
    run(host="127.0.0.1", port=port, token=token, data_dir=data_dir)


if __name__ == "__main__":
    main()
