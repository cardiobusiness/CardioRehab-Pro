# CardioRehab Pro - Desenvolvimento

## Android no Windows 11

Use `npm run android:configure` para configurar as variáveis do usuário, `npm run android:doctor` para verificar o ambiente e `npm run android` para abrir o emulador, iniciar/reutilizar API/Metro, compilar e instalar o app. Portas preservadas: Metro 8082 e API 3334. Detalhes de instalação, AVD e hipervisor: [docs/android-windows.md](docs/android-windows.md).

## Leitura de frequência cardíaca BLE

A Home agora abre **Conectar frequencímetro**, com descoberta BLE real, BPM/RR e gráfico dos últimos 60 segundos. Vista/ative o sensor, toque em **Buscar sensores BLE**, confirme o identificador e selecione **Conectar este sensor**. Para testar sem equipamento, escolha **Testar sem sensor: simulador**, procure o sensor simulado e conecte. O modo simulado possui aviso explícito, pausa de dados e teste de reconexão.

Funciona localmente sem API/internet. A conexão termina ao sair da tela ou colocar o app em segundo plano. A tela de sessão preserva o painel no modo real. A FC ainda não é persistida nem vinculada a um paciente.

Após `npm ci`, recompile o app nativo: a biblioteca Bluetooth não é instalada pelo hot reload. No iOS, instale os pods em macOS antes de compilar. Use aparelhos físicos para validar rádio e sensores.

Testes do protocolo e transporte simulado: `npm run test`. Checagem TypeScript: `npm run typecheck`.

Auditoria, compatibilidade por protocolo, limitações, arquivos e roadmap: [docs/ble-audit.md](docs/ble-audit.md).

Passo a passo Android/iOS, simulador, Polar H7/H10/Verity Sense, arquivos desta continuação e resultados: [docs/ble-monitoring.md](docs/ble-monitoring.md).

## Estrutura detectada

Este projeto e um monorepo npm workspaces:

- API Node/Fastify: `services/api`
- App mobile React Native: `apps/mobile`
- Regras clinicas compartilhadas: `packages/clinical-core`

O app mobile possui codigo React Native em `apps/mobile/src` e projetos nativos em `apps/mobile/android` e `apps/mobile/ios`.

## Portas

- API local: `3334`
- Metro React Native: `8082`

## Iniciar tudo

Na raiz do projeto:

```bash
npm run dev
```

Isso inicia a API e o Metro juntos.

## Iniciar somente a API

Na raiz do projeto:

```bash
npm run dev:api
```

URL:

```text
http://127.0.0.1:3334
```

## Iniciar somente o Metro

Na raiz do projeto:

```bash
npm run dev:mobile
```

URL de status:

```text
http://127.0.0.1:8082/status
```

## Testar o endpoint /health

PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3334/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "cardiorehab-api"
}
```

## URL da API no app mobile

O app usa `apps/mobile/src/services/apiConfig.ts`.

- Android Emulator: `http://10.0.2.2:3334`
- iOS Simulator: `http://127.0.0.1:3334`
- Desenvolvimento fora de emulador: `http://127.0.0.1:3334`

Para dispositivo fisico Android, use uma destas opcoes:

1. Rodar `adb reverse tcp:3334 tcp:3334` e configurar o app para localhost.
2. Usar o IP da maquina na rede local, por exemplo `http://192.168.2.102:3334`, garantindo que celular e computador estejam na mesma rede.

## Abrir no Android Emulator

Pre-requisitos:

- Android Studio instalado.
- Android SDK instalado.
- JDK instalado e `JAVA_HOME` configurado.
- `adb` disponivel no PATH.
- Um emulador Android criado e iniciado.
- Pasta nativa `apps/mobile/android` existente.

Com o emulador aberto, rode na raiz:

```bash
npm run android
```

No Windows, o comando da raiz agora usa `scripts/android.ps1`: verifica portas, abre/reutiliza o AVD, prepara API/Metro, compila com Gradle e instala pelo ADB. O comando React Native original continua disponível no workspace:

```bash
npm run android --workspace @cardiorehab/mobile
```

## Abrir em dispositivo fisico Android

Pre-requisitos:

- JDK instalado e `JAVA_HOME` configurado.
- Android SDK Platform Tools no PATH para usar `adb`.
- Depuracao USB ativada no Android.
- Dispositivo autorizado no computador.
- `adb devices` mostrando o dispositivo como `device`.
- Pasta nativa `apps/mobile/android` existente.

Com o Metro rodando:

```bash
npm run dev:mobile
```

Em outro terminal:

```bash
adb reverse tcp:8082 tcp:8082
adb reverse tcp:3334 tcp:3334
npm run android --workspace @cardiorehab/mobile
```

## Abrir no iOS

iOS so e aplicavel em macOS com Xcode instalado. No Windows, nao e possivel compilar ou abrir o app iOS localmente.

Em macOS, com a pasta nativa `apps/mobile/ios` existente:

```bash
npm run ios
```

O script usa:

```bash
react-native run-ios --port 8082
```

## Estado verificado neste ambiente

- Node.js: compativel com o projeto.
- `npm install`: concluido.
- `npm run typecheck`: concluido com sucesso.
- React Native CLI: reconhece Android e iOS no projeto mobile.
- Android Studio, JDK 17, SDK/ADB e AVD `CardioRehab_API_36` instalados e configurados.
- Windows Hypervisor Platform ativado; o Windows exige reinicialização para disponibilizar a aceleração do emulador.
- Resultados atuais da compilação e instruções: `docs/android-windows.md`. A interface no emulador depende de concluir essa reinicialização.
