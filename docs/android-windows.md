# Android no Windows 11

O projeto nativo existente fica em `apps/mobile/android`. Nao recriar o projeto, executar init ou instalar Gradle globalmente. O Gradle Wrapper versionado fornece Gradle 9.0.0. O plugin Android usado pelo React Native e 8.12.0; compilacao requer JDK 17 e SDK Android 36.

## Resultado desta configuracao

- Android Studio instalado pelo winget, com instalacao concluida.
- JDK 17.0.20.1 instalado e executado. JAVA_HOME do projeto usa a distribuicao portatil verificada em `%LOCALAPPDATA%\Programs\Java\jdk-17.0.20.1+1`; o instalador Temurin 17 do sistema tambem concluiu.
- SDK e componentes instalados em `%LOCALAPPDATA%\Android\Sdk`; ADB 1.0.41 / platform-tools 37.0.1 executado. Build Tools 35.0.0 tambem foi instalado automaticamente pelo Gradle para dependencias nativas, mantendo 36.0.0 disponivel.
- Gradle Wrapper 9.0.0 executado e plugins Kotlin/Gradle do React Native compilados com sucesso.
- Imagem Google APIs API 36 x86_64 instalada e AVD `CardioRehab_API_36` criado (Pixel 4, 1536 MB, 2 CPUs).
- Variaveis de usuario e local.properties configurados; Metro 8082 e API 3334 preservados.
- **Windows Hypervisor Platform ativado, com reinicializacao exigida pelo Windows. O computador nao foi reiniciado automaticamente.** Resultado administrativo registrado localmente em `.dev-logs/android-hypervisor.json`. Ate reiniciar, `emulator -accel-check` ainda informa que o hipervisor nao esta utilizavel.
- Os 23 testes automatizados e o typecheck dos tres workspaces passaram.
- `npm run android:build` concluiu com **BUILD SUCCESSFUL**, gerando `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (46.554.120 bytes, x86_64). A compilacao completa validou Java/Kotlin, autolinking BLE, C++ e empacotamento. O build que validou a correcao levou 23 minutos neste computador com pouca memoria disponivel; compilacoes seguintes podem reutilizar os artefatos.
- A instalacao e a interface em execucao no emulador ainda nao foram validadas: o primeiro boot depende da reinicializacao pendente. Nenhum teste com hardware Polar foi realizado nesta configuracao.

A primeira tentativa do APK encontrou `Filename longer than 260 characters` no Ninja/C++ de `safeareacontext`. A configuracao em `apps/mobile/android/app/build.gradle` foi ajustada para usar um cache C++ curto em `%LOCALAPPDATA%\CardioRehab\cxx\<id-do-checkout>`, limitar caminhos de objetos a 240 caracteres e limitar a compilacao nativa a dois jobs (um de link). Somente arquivos gerados ficam nesse cache; o projeto permanece no diretorio original. Essa configuracao nao depende de alterar o registro global de caminhos longos do Windows nem de mover o monorepo.

Salve seu trabalho e reinicie o Windows antes do primeiro boot do AVD. Depois, reabra o terminal/IDE e execute `npm run android:doctor` e `npm run android` na raiz. Nao e necessario instalar novamente os componentes.

O comando `npm run android` foi executado ate a verificacao do hipervisor: reutilizou corretamente os servicos 8082/3334 e interrompeu antes do boot, informando a reinicializacao necessaria. O ADB atualizou um servidor antigo da versao 40 para 41 durante esse teste.

## Comandos do projeto

Na raiz:

```powershell
npm run android:configure  # grava variaveis de usuario e local.properties
npm run android:doctor    # verifica ferramentas, AVDs, aceleracao e portas
npm run android:build     # gera APK debug x86_64 para o emulador
npm run android:emulator  # abre o AVD sem compilar
npm run android           # abre AVD, inicia/reutiliza API e Metro, compila, instala e abre o app
```

`npm run android` usa o AVD `CardioRehab_API_36`. Se ele nao existir e houver apenas um AVD instalado, utiliza esse AVD. Tambem reutiliza um unico emulador ja aberto. Mais de um emulador ativo causa uma mensagem para selecionar apenas o desejado, evitando instalar no dispositivo errado. O build e x86_64 e destinado ao emulador Windows Intel/AMD; para outros aparelhos/ABIs, use o comando React Native do workspace mobile com a arquitetura apropriada.

O launcher `scripts/android.cjs` usa `scripts/android.ps1` no Windows e preserva o comando original do workspace mobile em macOS/Linux. O comando direto tambem continua disponivel (`npm run android --workspace @cardiorehab/mobile`). Os comandos auxiliares android:doctor/configure/build/emulator sao especificos do Windows. A compilacao usa no maximo dois workers e `--no-daemon`, para liberar a memoria do Gradle apos o build neste computador com 8 GB.

## Ferramentas e caminhos

- Android Studio: normalmente `C:\Program Files\Android\Android Studio`.
- SDK: `%LOCALAPPDATA%\Android\Sdk` ou o caminho ja configurado em ANDROID_HOME/ANDROID_SDK_ROOT.
- JDK 17: Eclipse Adoptium em Program Files ou distribuicao portatil em `%LOCALAPPDATA%\Programs\Java\jdk-17*`.
- AVDs: `%USERPROFILE%\.android\avd`.
- SDK packages: platform-tools, platforms;android-36, build-tools;36.0.0, ndk;27.1.12297006, cmake;3.22.1, emulator e system-images;android-36;google_apis;x86_64.

`android:configure` preserva entradas existentes do PATH e acrescenta os binarios de Java, platform-tools, emulator e cmdline-tools. Configura JAVA_HOME, ANDROID_HOME e ANDROID_SDK_ROOT no usuario, sem alterar variaveis de outros usuarios. Reabra o terminal e o IDE para herdar as variaveis. `npm run android` tambem resolve esses caminhos no proprio processo, dispensando reiniciar o IDE para esse comando.

`apps/mobile/android/local.properties` e gerado com sdk.dir e ignorado pelo Git. Outros valores existentes no arquivo sao preservados.

## Se precisar concluir a instalacao manualmente

1. Confirme eventuais janelas de Controle de Conta de Usuario dos instaladores JDK/Android Studio. Uma instalacao aguardando UAC nao equivale a uma ferramenta instalada.
2. Abra Android Studio. Na tela inicial, **More Actions > SDK Manager**. Em **SDK Platforms**, instale **Android 16 / API 36**. Em **SDK Tools**, habilite **Show Package Details** e instale **Android SDK Build-Tools 36.0.0**, **Platform-Tools**, **Command-line Tools (latest)**, **Android Emulator**, **NDK (Side by side) 27.1.12297006** e **CMake 3.22.1**. Confirme o SDK Location.
3. Se JDK 17 nao estiver instalado, use o instalador Temurin 17 JDK ou uma distribuicao oficial portatil. O runtime embutido do Android Studio pode ser uma versao diferente; o build do projeto procura JDK 17 explicitamente.
4. Em **More Actions > Device Manager > Create Device**, escolha um telefone Pixel e imagem **API 36, Google APIs, x86_64**. Nomeie `CardioRehab_API_36`. Nao e necessario instalar Google Play para este app. Neste computador com 8 GB de RAM, comece com 1536–2048 MB de RAM no AVD e feche aplicativos pesados.
5. Execute `npm run android:configure` e `npm run android:doctor` na raiz do projeto.

Com as ferramentas de linha de comando e variaveis configuradas, os componentes tambem podem ser instalados por:

```powershell
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1' 'emulator' 'system-images;android-36;google_apis;x86_64'
'no' | & "$env:ANDROID_HOME\cmdline-tools\latest\bin\avdmanager.bat" create avd --name CardioRehab_API_36 --package 'system-images;android-36;google_apis;x86_64' --device pixel_4
```

## Aceleracao e reinicializacao

Virtualizacao Intel/AMD deve estar habilitada no firmware. Neste computador foi detectada habilitada, mas o hipervisor nao estava ativo na verificacao inicial.

Para habilitar a plataforma do emulador, pressione Win+R, execute `optionalfeatures`, marque **Plataforma do Hipervisor do Windows / Windows Hypervisor Platform**, confirme e reinicie quando o Windows solicitar. Se preferir, em PowerShell **como administrador**:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All -NoRestart
```

Salve o trabalho e reinicie manualmente. O script do projeto nunca reinicia o computador nem altera o boot automaticamente. Se, depois disso, `emulator -accel-check` continuar falhando, confira a virtualizacao no BIOS/UEFI e a configuracao do hipervisor com o administrador do computador.

## Portas e comunicacao

- Metro: **8082**. O script configura adb reverse tcp:8082 tcp:8082 para o emulador escolhido.
- API: **3334**. No Android Emulator, `apps/mobile/src/services/apiConfig.ts` usa **http://10.0.2.2:3334** para acessar o Windows hospedeiro. Nao substituir por localhost no emulador.
- O app debug permite HTTP local pelo plugin do React Native; release nao recebe essa permissao de desenvolvimento.
- Antes de iniciar processos, o script verifica os listeners e os endpoints `/status` e `/health`. Servicos corretos sao reutilizados; portas ocupadas por outros servicos interrompem a execucao, exibindo o PID. Nenhum processo e encerrado automaticamente. Metro com command line identificavel de outro checkout tambem e recusado.
- Servicos iniciados pelo comando ficam em segundo plano, com logs `.dev-logs/api.*.log` e `.dev-logs/metro.*.log`. O emulador abre visivelmente.

## Primeiro teste

Depois de `npm run android`, aguarde a compilacao inicial (downloads Maven, Gradle e compilacao C++ podem levar varios minutos). A Home deve mostrar CardioRehab Pro com botoes verdes **#38E7A7**.

Abra **Conectar frequencimetro > Testar sem sensor: simulador > Procurar sensor simulado > Conectar este sensor**. O emulador serve para testar a interface e o simulador. Nao representa validacao do radio BLE ou dos sensores Polar; conexoes reais devem ser testadas em celular fisico.

Validacao de software:

```powershell
npm run test
npm run typecheck
```

## Fontes oficiais

- React Native 0.82: https://reactnative.dev/docs/0.82/set-up-your-environment
- SDK: https://developer.android.com/studio
- Aceleracao: https://developer.android.com/studio/run/emulator-acceleration
- Rede do emulador: https://developer.android.com/studio/run/emulator-networking
