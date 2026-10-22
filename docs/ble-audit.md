# Integração universal BLE — auditoria e primeira entrega

Data: 21/10/2026. Escopo implementado: descoberta e leitura de FC/RR em primeiro plano, em um sensor por vez. Não constitui validação assistencial.

Continuação: tela dedicada, gráfico temporal e simulador funcional estão documentados em [ble-monitoring.md](ble-monitoring.md), incluindo os resultados atuais (23 testes). Os resultados de 15 testes abaixo correspondem à primeira entrega.

## 1. Base existente e reaproveitamento

O monorepo npm workspaces contém React Native CLI (RN 0.82.1/React 19.1.1), API Fastify, clinical-core e migração SQL Supabase. Reaproveitados: navegação, tela de sessão, componentes de métricas e cálculo aritmético de duplo produto. A interface Polar e o simulador ECG foram preservados para evolução, com acesso identificado como demonstração.

Prisma é uma tecnologia planejada, mas não está instalado. API e banco não são usados pela aquisição BLE desta etapa. Nenhum dado clínico ou identificador BLE é enviado ao backend.

Problemas preexistentes: regras de risco por palavras-chave sem tratamento de negação/dados insuficientes, alertas clínicos não validados, ausência de autenticação/persistência, migração sem RLS/tenancy, assinatura Android release de debug, ausência de Git reconhecido na pasta. A ligação de FC real não habilita esses alertas. Relatório e ECG continuam demonstrações.

## 2. Auditoria do BLEHeartRateLogger

Repositório clonado em `%TEMP%/CardioRehab-BLEHeartRateLogger-audit`.
Commit examinado: `0c87914aa268c61a1cd21e2bac14cc176902b923`, de 19/04/2024. A data do último commit não garante manutenção ou compatibilidade atual. Código inicial e licença datam de 2015; setup declara versão 0.1.0 e o script, 0.1.1.

- Python/Linux: usa `pexpect` para controlar `hcitool lescan` e `gatttool --interactive`.
- Descoberta: escolhe o primeiro endereço encontrado, sem seleção segura por paciente ou confirmação de HRS. Essa estratégia não foi reproduzida.
- Conexão: identifica handles de `2A37`/CCCD `2902`, habilita notificações e reconecta após timeout de 10 s.
- Parser: flags, BPM uint8/uint16 little endian, contato, energia e múltiplos RR. RR é armazenado no formato bruto de 1/1024 s.
- Persistência: SQLite, timestamp em segundos e commits em lotes ajustados à duração das gravações.
- Limitações: sem verificações suficientes de payload truncado, dependência de saída textual de ferramentas Linux, repetição sem limite, ausência de separação paciente/sessão e segurança de dados clínicos. O filtro do script suaviza o período entre notificações, não o sinal ECG.

A licença é BSD de três cláusulas: permite uso/modificação comercial com avisos de copyright/licença/disclaimer e proíbe endosso pelo nome dos colaboradores sem autorização. Nenhum arquivo, trecho ou tradução do código Python foi incorporado ao produto. O parser foi escrito a partir da especificação Bluetooth; conceitos aproveitados: notificações, interpretação de flags, RR e reconexão. Se código do projeto vier a ser incorporado, incluir o texto integral da licença e os avisos na distribuição.

Não instalar apt, BlueZ, Python ou pexpect no app. Não executar o projeto de referência como parte da solução mobile.

## 3. Biblioteca escolhida

`react-native-ble-plx` 3.5.1, com `base64-js` 1.5.1 para decodificação. Correção da referência anterior à licença MIT: o package.json informa MIT, mas o arquivo LICENSE distribuído contém Apache-2.0, também exibida no repositório oficial. Oferece scan, descoberta GATT, conexão, notificações, estado do rádio e cancelamento em Android/iOS. `react-native-ble-manager` é uma alternativa válida; não há necessidade de manter duas bibliotecas para o mesmo transporte.

A documentação publicada da biblioteca ainda identifica 3.3.0 em alguns pontos; a instalação e a checagem de tipos usam 3.5.1. RN 0.82 exige New Architecture. Autolinking e compatibilidade de runtime ainda precisam de build nativo e aparelho físico; peer dependencies permissivas não comprovam esse suporte.

## 4. Compatibilidade

| Dispositivos candidatos | FC padrão | RR | Recurso proprietário |
| --- | --- | --- | --- |
| Polar H7/H9/H10 | HRS/2A37, sujeito à validação física | Somente se flags/payload oferecerem | H10: ECG via SDK Polar |
| Polar Verity Sense | HRS/2A37, sujeito à validação física | Não presumido | SDK Polar para PPG/PPI; PPI não é RR elétrico |
| Garmin HRM-Dual/HRM-Pro/Pro Plus | Quando o modo/modelo/firmware expuser HRS notificável | Consultado no payload | Métricas adicionais não implementadas |
| Wahoo TICKR, Magene, Coospo, Decathlon e outros | Quando expuserem HRS notificável | Consultado no payload | Avaliar caso a caso |

Esta tabela define candidatos por protocolo, não certifica modelos ou marcas. Nenhum modelo foi testado fisicamente nesta entrega. Não inferir canais simultâneos, acurácia ou recursos pelo nome do fabricante.

O scan filtra o UUID `180D`; dispositivos que não o anunciam podem não aparecer, mesmo que o serviço exista após conexão. Uma busca ampliada com verificação GATT poderá ser adicionada depois, sem conectar automaticamente a qualquer dispositivo próximo. HRS e `2A37` notificável são confirmados após conexão. Nome e identificador são os fornecidos pelo sistema; no iOS o identificador é opaco, não um MAC. Manufacturer data é mostrado como ID numérico anunciado, sem inferir uma marca autenticada.

## 5. Comportamento entregue

- Busca de 12 s, lista deduplicada com nome/ID/RSSI/fabricante anunciado, seleção explícita, conexão e desconexão.
- Parser com BPM uint8/uint16, contato, energia opcional e múltiplos RR convertidos para ms sem arredondamento destrutivo; rejeita pacotes inconsistentes.
- Timestamp UTC de **recebimento no celular**: HRS não fornece horário absoluto do sensor. Intervalos RR não recebem timestamps inventados.
- Estado de conexão, ausência de contato, leituras rejeitadas e dados vencidos após 5 s. Cinco segundos é um parâmetro operacional inicial a validar, não limite clínico.
- Reconexão limitada a três tentativas com intervalos de 1/3/7 s, exclusivamente ao ID selecionado. O orçamento é por conexão selecionada, não reiniciado a cada pacote, para impedir ciclos infinitos. Novo ciclo exige seleção manual após desconectar.
- Encerramento de conexão ao sair da tela ou entrar em segundo plano; sem promessa de aquisição em background.
- FC local sem internet. Sem persistência de histórico, sincronização ou credenciais nesta fase.
- Duplo produto é um snapshot manual de FC × PAS, com os dois horários e ID do sensor. Permanece fixo até novo registro de PA; não há medição automática de pressão.
- Marca visual `#38E7A7`. Nenhum diagnóstico automático ou alerta clínico baseado nas regras experimentais foi habilitado.

Não há histórico persistente de dispositivos utilizados, alertas ou auditoria de sessão nesta fase. A lista de descoberta permanece somente enquanto a tela está ativa. Esses recursos dependem de identidade, armazenamento protegido e vínculo paciente/sessão.

## 6. Arquivos criados/alterados

- `apps/mobile/src/sensors/heartRate.ts`: contratos, UUIDs e parser independente.
- `apps/mobile/src/sensors/heartRateMonitor.ts`: transporte injetável, descoberta e ciclo de conexão.
- `apps/mobile/src/sensors/nativeBle.ts`: permissões e verificação do rádio.
- `apps/mobile/src/components/HeartRatePanel.tsx`: seleção e monitoramento.
- `apps/mobile/src/screens/SessionScreen.tsx`: FC real, DP pontual e identificação dos fluxos demo.
- `apps/mobile/tests/*.test.ts`: parser e ciclo de conexão com transporte simulado.
- `apps/mobile/android/app/src/main/AndroidManifest.xml`: permissões BLE por versão.
- `apps/mobile/ios/CardioRehabProNative/Info.plist`: descrição de uso Bluetooth.
- `apps/mobile/android/app/build.gradle`: caminhos de dependências corrigidos para o monorepo.
- `apps/mobile/metro.config.js`: watchFolders e resolução das dependências compartilhadas na raiz, necessários para gerar o bundle do monorepo.
- `apps/mobile/package.json` e `package-lock.json`: dependências e executor dos testes.

Backend, migração SQL, clinical-core e simulador Polar não foram modificados. A abstração não acopla o protocolo a marcas; futuros transportes ANT+ e Polar devem traduzir dados para contratos explícitos e manter ownership exclusivo da conexão.

## 7. Próximas fases

1. **Validar BLE:** compilar Android/iOS, testar permissões negadas, rádio desligado, sensor em uso por outro receptor, ausência de contato, payloads reais e sessões de 60–120 min. Validar obsolescência, cancelamento e reconexão com diferentes fabricantes.
2. **Polar H10:** SDK nativo Kotlin/Swift, matriz de versões/firmware, capacidades negociadas, ECG em µV a 130 Hz e buffers em lotes. Documentação atual do SDK pede Android minSdk 33; o projeto usa 24. Fixar versão somente após decisão de aparelhos suportados.
3. **ECG:** sinal de uma derivação disponibilizado pelo H10; sem equivalência a ECG diagnóstico de 12 derivações ou diagnóstico automático. Preservar sinal bruto, escalas, frequência efetiva, origem temporal e lacunas; redução só para exibição. Guardar blocos criptografados/localmente protegidos e metadados no banco; evitar uma linha SQL por amostra.
4. **Monitoramento clínico:** autenticação/tenancy, sessão identificada, vínculo exclusivo paciente–sensor confirmado pelo profissional, prescrição individual e estados de dados insuficientes. BP/Borg/SpO2 manuais têm origem/horário próprios. Histórico de eventos/alertas e auditoria durável.
5. **Multipacientes:** registro central de conexões por `patientId/sessionId/deviceId`, impedir dupla atribuição, filas de operações BLE, dashboard individual e testes de carga. Não existe um número universal garantido de conexões simultâneas: medir 1/2/4/6 sensores nos aparelhos e versões suportados, com e sem ECG, incluindo perda de pacotes, latência, bateria e interferência. Não anunciar capacidade antes desses ensaios.
6. **Persistência e comercialização:** armazenamento local protegido, sincronização idempotente por lotes, backend autorizado, RLS/isolamento testado, retenção, auditoria e relatórios. Validar finalidade de uso/enquadramento regulatório e LGPD antes de uso assistencial. CI, assinatura de produção, ambientes separados, backup/restauração e revisão de dependências antes do deploy.

## 8. Validação e reprodução

Software: `npm run test` e `npm run typecheck` na raiz. Os testes utilizam transporte simulado; não comprovam operação do rádio, acurácia, latência ou compatibilidade nativa. Para um novo checkout: `npm ci`.

Resultado: **15 testes passaram** (parser, descoberta/deduplicação, capacidades GATT, atribuição ao dispositivo, payload inválido, reconexão limitada, interrupção manual, troca de sensores, limpeza, conexão pendente e erro de notificação). **Typecheck passou nos três workspaces.** O teste inicial falhou com `spawn EPERM` por restrição do sandbox; a suíte foi reexecutada com permissão de subprocessos e passou.

**Bundle JavaScript Android de produção gerado com sucesso pelo Metro**, em `%TEMP%/CardioRehab-ble-android.bundle`, após corrigir a resolução do monorepo. Verificação feita com `react-native bundle --platform android --dev false --entry-file index.js --max-workers 2` e saída temporária. Não foram empacotados assets nesse teste. Isso valida resolução/transpilação JavaScript; não compila Kotlin/Java, não gera APK e não valida a ponte BLE nativa.

Android: instalar/configurar JDK compatível com RN/Gradle, SDK Android e adb. Executar `npm run android` com aparelho físico conectado. Neste ambiente `gradlew --version` falhou porque `JAVA_HOME` não está definido e Java não está no PATH; adb também não foi encontrado.

iOS: em macOS com Xcode e CocoaPods, instalar pods na pasta iOS e recompilar o aplicativo. Testar em iPhone físico. Não foi compilado neste Windows. Recarregar apenas o JavaScript não instala a biblioteca BLE nativa.

Uma leitura na tela é válida somente para o dispositivo selecionado e não representa sessão salva. Relatórios/ECG demo não usam a FC real. Não anunciar uso assistencial ou multipaciente validado.

Consulta explícita `npm audit --json` após instalação: 48 avisos (2 baixos, 7 moderados, 37 altos, 2 críticos). O resumo do install apresentou contagens menores; esta auditoria usa a consulta explícita registrada. Dependências diretas afetadas incluem `concurrently`, Fastify, React Native e ferramentas CLI/Metro. Resultado detalhado local: `.dev-logs/ble-npm-audit.json`. A contagem é de avisos da árvore, não de explorações comprovadas no aplicativo. Não foi executado `npm audit fix --force`; revisar caminhos e atualizações antes de produção.

## Fontes primárias

- Referência analisada: https://github.com/fg1/BLEHeartRateLogger/tree/0c87914aa268c61a1cd21e2bac14cc176902b923
- Licença: https://github.com/fg1/BLEHeartRateLogger/blob/0c87914aa268c61a1cd21e2bac14cc176902b923/LICENSE
- Biblioteca: https://github.com/dotintent/react-native-ble-plx ; https://dotintent.github.io/react-native-ble-plx/
- Especificação: https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html
- Polar: https://github.com/polarofficial/polar-ble-sdk
- RN 0.82: https://reactnative.dev/blog/2025/10/08/react-native-0.82
