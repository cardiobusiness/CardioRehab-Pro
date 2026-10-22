# Fluxo de conexao Bluetooth

## Sensores suportados

| Sensor | Dados | Integracao |
| --- | --- | --- |
| Polar H7 | FC e RR | Bluetooth Low Energy Heart Rate Service |
| Polar H10 | FC, RR e ECG | Polar BLE SDK |
| Polar Verity Sense | FC optica, PPG e PP | Polar BLE SDK |

## Fluxo operacional

1. Fisioterapeuta seleciona o sensor.
2. App solicita permissoes de Bluetooth e localizacao quando exigido pelo sistema.
3. App escaneia dispositivos compativeis.
4. Usuario escolhe o dispositivo identificado.
5. App conecta e valida capacidades do sensor.
6. Sessao inicia stream de FC e intervalos.
7. Para Polar H10, o modulo ECG negocia settings e inicia stream de ECG.
8. Dados sao agregados em memoria, exibidos em tempo real e persistidos por checkpoints.

## Estados de conexao

- `idle`: sem tentativa ativa.
- `scanning`: procurando sensor.
- `connecting`: conectando ao dispositivo.
- `connected`: sensor pronto para sessao.
- `streaming`: dados em tempo real ativos.
- `disconnected`: sensor desconectado.
- `error`: erro recuperavel ou critico.

## Adaptador nativo previsto

O arquivo `apps/mobile/src/services/polarBleService.ts` define a interface do adaptador. Em producao, ele deve ser ligado a:

- Android/iOS: Polar BLE SDK nativo.
- BLE generico: Heart Rate Service `0000180d-0000-1000-8000-00805f9b34fb`.

