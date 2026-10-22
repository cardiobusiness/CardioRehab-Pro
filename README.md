# CardioRehab Pro

Plataforma clinica para fisioterapia cardiovascular e reabilitacao cardiaca.

## Objetivo

Monitorar, registrar e gerar relatorios de sessoes de reabilitacao cardiaca com frequencia cardiaca em tempo real, ECG, estratificacao de risco cardiovascular e controle do duplo produto.

## Arquitetura

- `apps/mobile`: aplicativo React Native com telas principais e servicos de Bluetooth/ECG.
- `services/api`: backend Node.js para relatorios, sessoes e integracao com Supabase.
- `packages/clinical-core`: regras clinicas compartilhadas entre app e API.
- `supabase/migrations`: estrutura inicial do banco PostgreSQL.
- `docs`: especificacoes de arquitetura e fluxo BLE.

## Sensores previstos

- Polar H7: frequencia cardiaca BLE e intervalo RR.
- Polar H10: frequencia cardiaca, RR interval e ECG em tempo real via Polar BLE SDK.
- Polar Verity Sense: frequencia cardiaca optica, PPG e intervalo PP.

## Primeiros comandos

```bash
npm install
npm run typecheck
```

As dependencias nativas de React Native, Supabase e Polar BLE SDK ainda precisam ser instaladas no ambiente alvo antes de executar em dispositivo fisico.

