# src/__main__.py
"""Intelbras DVR Health Check Monitor - Entry point."""
from src.config import load_config, ensure_dirs


def main():
    config = load_config()
    ensure_dirs(config)
    print(f"Config carregado: DVR em {config.dvr.host}, monitorando {len(config.dvr.channels)} canais")
    print(f"Intervalo de verificação: {config.monitoring.check_interval_seconds}s")
    print(f"Timeout RTSP: {config.monitoring.timeout_seconds}s")
    print(f"Alerta após {config.monitoring.consecutive_failures_alert} falhas consecutivas")
    # TODO: Inicializar monitor, scheduler, alertas


if __name__ == "__main__":
    main()