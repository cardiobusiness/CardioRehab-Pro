# Monitoramento de frequência cardíaca — entrega funcional

## Estado verificado

A auditoria anterior foi concluída e permanece em [ble-audit.md](ble-audit.md). Esta entrega acrescenta a tela **Conectar frequencímetro**, o gráfico temporal e o simulador ao transporte BLE real existente. Não acrescenta ECG, estratificação de risco, monitoramento multipaciente ou persistência clínica.

Stack preservada: npm workspaces, React Native CLI 0.82.1, React 19.1.1, Fastify e clinical-core. Mantida `react-native-ble-plx` 3.5.1, já instalada, com `base64-js` e `react-native-svg`; não foram adicionadas dependências. A biblioteca fornece integração Android/iOS e o CLI reconhece seu autolinking nas duas plataformas. Typecheck e bundle não comprovam a ponte nativa em execução: compatibilidade operacional com RN 0.82 depende de compilação e teste nos aparelhos suportados.

Correção documental da auditoria anterior: o package.json da biblioteca informa MIT, mas seu arquivo LICENSE distribuído contém Apache-2.0, também exibida no repositório oficial. A referência de licença foi corrigida; preservar os avisos efetivamente distribuídos antes de comercialização.

Permissões já configuradas e verificadas:

- Android até API 30: BLUETOOTH/BLUETOOTH_ADMIN e localização precisa em runtime. Localização do sistema também precisa estar ativa para descoberta nessas versões.
- Android API 31+: BLUETOOTH_SCAN e BLUETOOTH_CONNECT em runtime; scan com `neverForLocation`.
- iOS: NSBluetoothAlwaysUsageDescription e autorização pelo sistema.

Não há operação em background nesta entrega: sair da tela ou colocar o app em segundo plano encerra a conexão. É necessário conectar novamente ao voltar.

## O que funciona

- Home → **Conectar frequencímetro**.
- Busca por 12 segundos de anúncios com serviço `0000180D-0000-1000-8000-00805F9B34FB`.
- Lista deduplicada com nome, identificador do sistema, RSSI da descoberta e manufacturer ID quando anunciado.
- Seleção explícita, conexão, descoberta GATT e validação de característica `00002A37-0000-1000-8000-00805F9B34FB` notificável.
- Notificações contínuas, BPM uint8/uint16 little endian conforme flags, RR opcionais em ms e estado de contato quando disponível. Payloads inválidos são rejeitados.
- BPM atual, horário de recebimento, RR e gráfico dos últimos 60 segundos com eixos BPM/tempo. Usa timestamps reais de recebimento, limita memória a 300 pontos e não desenha linhas atravessando lacunas maiores que 5 segundos ou interrupções notificadas.
- Após 5 segundos sem leitura válida, o BPM atual vira “—” e aparece “Dados desatualizados”. Cinco segundos é um parâmetro operacional inicial.
- Em perda de conexão, limpa o valor atual e reconecta ao mesmo identificador, com até três tentativas em 1/3/7 segundos. Manualmente, **Desconectar** cancela tentativas; após esgotá-las, **Reconectar este sensor** inicia novo ciclo.
- A leitura local não depende da API ou da internet. Histórico do gráfico é temporário e não representa sessão salva.

Dispositivos que não anunciam 180D podem não aparecer mesmo que exponham HRS depois de conectados. A identidade anunciada não autentica o paciente. O timestamp é o recebimento no celular: o protocolo HRS não fornece horário absoluto do sensor.

## Iniciar

Use Node 24 LTS e as dependências do lockfile. Na raiz, se necessário:

```powershell
npm ci
```

Android requer JDK/Gradle compatíveis, SDK Android, platform-tools/adb e aparelho com depuração USB autorizada. Neste ambiente Java/JAVA_HOME e adb não foram encontrados. Com essas ferramentas configuradas:

```powershell
# Terminal 1, na raiz
npm run dev:mobile
```

```powershell
# Terminal 2, na raiz, com dispositivo USB autorizado
adb devices
adb reverse tcp:8082 tcp:8082
npm run android --workspace @cardiorehab/mobile
```

A API não precisa estar rodando para monitorar FC. Recompilar é necessário para instalar a biblioteca nativa; hot reload não substitui a compilação.

Na configuração Windows atual, `npm run android` na raiz é o fluxo automático de **emulador**. Para um celular USB, use o comando do workspace acima. Configuração atual das ferramentas e reinicialização do hipervisor: [android-windows.md](android-windows.md). Os resultados de build descritos abaixo registram a entrega BLE anterior; consulte esse guia Android para os resultados posteriores de configuração nativa.

iOS requer macOS, Xcode e CocoaPods. Depois de `npm ci`, execute `pod install` em `apps/mobile/ios`; inicie Metro com `npm run dev:mobile`. Abra o `.xcworkspace` gerado, selecione equipe de assinatura e iPhone físico e execute pelo Xcode. O comando `npm run ios` também inicia o build no destino configurado. Este projeto usa Metro na porta 8082. O build Windows não compila iOS.

## Testar sem equipamento

1. Abra **Conectar frequencímetro** e toque em **Testar sem sensor: simulador**.
2. Confirme o aviso amarelo **SIMULAÇÃO ATIVA**. Toque em **Procurar sensor simulado** e depois **Conectar este sensor**.
3. BPM/RR variam a cada segundo; gráfico, RSSI e conexão são identificados como artificiais. Nenhum Bluetooth físico é acessado no modo simulado.
4. Toque em **Pausar dados: testar sinal desatualizado**. Após mais de 5 segundos, o valor atual deve desaparecer e os pontos antigos devem envelhecer no gráfico.
5. Toque em **Retomar dados simulados**: o fluxo volta e o gráfico deixa uma lacuna.
6. Toque em **Simular desconexão e reconexão** e observe o estado de reconexão e a retomada. Há no máximo três tentativas por ciclo de conexão; após esgotadas, reconecte manualmente.
7. Troque para **Usar sensor Bluetooth real**. O simulador é descartado, o gráfico reinicia e os dados reais não se misturam aos artificiais.

O simulador usa o mesmo controlador de conexão, parser de pacotes HRS, relógio de recebimento e gráfico do modo real. Alterna os formatos uint8/uint16. Não é um periférico Bluetooth anunciado pelo telefone. A tela de sessão existente permanece no modo real e não recebe dados do simulador.

## Testar com Polar H7, H10 ou Verity Sense

1. No H7/H10, umedeça os eletrodos da cinta, coloque-a corretamente e encaixe o transmissor. Confira a bateria. No Verity Sense, ligue, selecione o modo FC (ícone de coração) e vista o sensor conforme o manual; aguarde estar pronto para medir.
2. Encerre conexões de outros apps/relógios que possam ocupar os canais do sensor. Não presuma que todos têm o mesmo limite de conexões.
3. No telefone físico, ative Bluetooth. No Android até 11, ative também localização. Abra **Conectar frequencímetro** com o modo real selecionado.
4. Toque em **Buscar sensores BLE**, autorize as permissões e confirme nome e identificador do seu Polar na lista. Se não aparecer, reative o sensor, aproxime-o e repita a busca.
5. Toque em **Conectar este sensor**. Observe **Conectado**, BPM variável e gráfico. RR só é exibido quando enviado: não se presume RR elétrico no Verity Sense.
6. Compare os valores com um receptor de referência em condições controladas, respeitando os canais disponíveis. Isso ainda não é validação de acurácia clínica.
7. Desligue/afaste o sensor para testar a indicação de perda, dados vencidos e reconexão ao mesmo ID. Restaure o sinal. No H7/H10, retirar a cinta pode alterar contato ou interromper transmissão, dependendo do modelo/firmware.
8. Teste **Desconectar**, negação de permissão, Bluetooth desligado e saída da tela. Nenhum valor antigo deve reaparecer como leitura atual.

Nesta entrega nenhum Polar, telefone ou rádio físico foi efetivamente testado. H7/H10/Verity Sense são candidatos pelo protocolo, sujeitos ao modo de operação, firmware e validação no aparelho.

## Validação executada

- `npm run test`: **23 testes passaram**. Inclui parser uint8/uint16/RR, descoberta, características GATT, rejeição de payloads, cancelamento e reconexão, troca de sensor, gráfico, limite de memória, dados vencidos e simulador ponta a ponta com transporte em memória e relógio controlado.
- `npm run typecheck`: **passou nos três workspaces**.
- CLI React Native: **autolinking Android/iOS de BLE PLX reconhecido**.
- Metro Android: **bundle JavaScript de produção gerado** em `%TEMP%/CardioRehab-ble-chart-android.bundle`, sem empacotamento de assets; isso não gera APK.
- Build nativo Android/iOS, renderização interativa da tela em aparelho/emulador e rádio BLE: **não executados**. Android sem ferramentas no ambiente; iOS exige macOS/Xcode. Os testes não certificam estabilidade, acurácia ou compatibilidade do hardware.

## Arquivos desta continuação

Criados:

- `apps/mobile/src/screens/ConnectHeartRateScreen.tsx`
- `apps/mobile/src/components/HeartRateChart.tsx`
- `apps/mobile/src/sensors/heartRateSeries.ts`
- `apps/mobile/src/sensors/simulatedBle.ts`
- `apps/mobile/tests/heartRateSeries.test.ts`
- `apps/mobile/tests/simulatedBle.test.ts`
- `docs/ble-monitoring.md`

Alterados:

- `apps/mobile/src/App.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/components/HeartRatePanel.tsx`
- `README_DEV.md`
- `docs/ble-audit.md` (referência da entrega atual e correção de licença)

Não foram alterados backend, banco, dependências/lockfile, regras clínicas, parser HRS, permissões nativas ou código ECG nesta continuação.

## Fontes

- Biblioteca: https://github.com/dotintent/react-native-ble-plx
- Especificação HRS: https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html
- Verity Sense em modo FC: https://support.polar.com/e_manuals/verity-sense/polar-verity-sense-user-manual-english/training-in-heart-rate-mode.htm
- H10: https://support.polar.com/en/support/troubleshooting_polar_h9_h10_heart_rate_sensor
