# Arquitetura do CardioRehab Pro

## Visao geral

O CardioRehab Pro usa uma arquitetura em camadas:

1. Aplicativo React Native para uso em sala de reabilitacao.
2. Pacote clinico compartilhado com regras de risco, duplo produto e modelos de sessao.
3. Backend Node.js para persistencia assistida, geracao de PDF e auditoria.
4. Supabase/PostgreSQL como banco clinico transacional.
5. Integracao nativa BLE para sensores Polar.

## Modulos

### Mobile

- Cadastro de paciente.
- Sessao de reabilitacao.
- Pareamento Bluetooth.
- Monitoramento de FC, PA, SpO2, Borg, sintomas, carga e intercorrencias.
- ECG em tempo real para Polar H10.
- Pre-visualizacao de relatorio final.

### Backend

- API HTTP para pacientes, sessoes e relatorios.
- Servico de PDF.
- Webhooks futuros para sincronizacao e auditoria.

### Clinical Core

- Tipos clinicos.
- Estratificacao de risco cardiovascular.
- Calculo e alertas de duplo produto.
- Contratos de ECG e amostras de sensores.

## Observacao regulatoria

Esta base e um software clinico inicial e nao substitui validacao tecnica, ensaios, gestao de risco, LGPD, seguranca, rastreabilidade e certificacoes aplicaveis antes de uso assistencial real.

