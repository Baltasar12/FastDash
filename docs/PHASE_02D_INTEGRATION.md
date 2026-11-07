# SECTOR — Phase 02D: candidato de integración local

Validación y tribunal realizados el 2026-11-07. Este informe registra una
integración implementada y probada; no autoriza publicación, merge ni despliegue.

## Identidad y trazabilidad

- Worktree: `E:\CODIGO\FastDash-integration-phase-02d`.
- Rama: `codex/integration-phase-02d`.
- Base común: `0a2d30a7e198d9f5dd3b2511d3620bdc0be2c061`.
- HEAD de implementación revisado: `075faef85da81e19097850427cfc3e808d498ad5`.
- El commit de cierre agrega únicamente este informe. Su SHA se obtiene con
  `git log -1`; no se incrusta su propio hash en el contenido del commit.
- La solicitud Phase 02D autoriza los cherry-picks y el commit local posterior
  a validación/revisión. No se ejecutaron push, PR, merge ni despliegue.

| Fase            | Commit de origen                           | Cherry-pick integrado                      |
| --------------- | ------------------------------------------ | ------------------------------------------ |
| 02A — CI        | `63a2471f5fcbf3f7844ed6a6f66823cde7f9cff6` | `2854336801ee939e28a42bdb7cb0acdf7775087b` |
| 02B — Jolpica   | `9690169eb144f2f03e242112e3f07dcf8c032a5e` | `8764f7437456813f97d3b35398094892a3c9b7ce` |
| 02C — Telemetry | `9cfaccfb5cff36a6dd4d046b179afcd2157482cf` | `075faef85da81e19097850427cfc3e808d498ad5` |

Se inspeccionaron status, ramas, HEAD, worktrees, merge-base y diff antes de
ensamblar. Cada origen contiene exactamente un commit sobre la base indicada;
los tres worktrees estaban limpios y sus HEAD coincidían con la solicitud.
Las rutas y la rama de destino no existían. Se creó el worktree aislado y se
aplicaron los commits en el orden indicado mediante `cherry-pick -x`, sin
conflictos. Los archivos de cada bloque integrado coinciden exactamente con su
commit de origen. Se preservaron todos los worktrees y ramas existentes y main.

Los cambios respetan los límites de propiedad: tres archivos de CI, seis de
Jolpica y los 21 archivos completos de Telemetry Lab. No hay cambios en
`package.json`, lockfile, contratos compartidos, rutas, navegación, componentes
compartidos ni CSS global. `F1_CONTRACT_VERSION` sigue siendo 1. La inspección
del diff y un escaneo de patrones de credenciales no encontraron secretos;
el escaneo es complementario, no una garantía universal de detección.

## Decisión de formato y finales de línea

La configuración heredada de Git es `core.autocrlf=true` a nivel de instalación.
La comparación del índice y checkout mostró blobs LF y archivos CRLF en el
checkout original. El problema documentado por 02B/02C era conversión de checkout,
no formato del contenido canónico.

Se creó el destino con:

```powershell
git -c core.autocrlf=false worktree add -b codex/integration-phase-02d E:/CODIGO/FastDash-integration-phase-02d 0a2d30a7e198d9f5dd3b2511d3620bdc0be2c061
git -c core.autocrlf=false cherry-pick -x 63a2471f5fcbf3f7844ed6a6f66823cde7f9cff6 9690169eb144f2f03e242112e3f07dcf8c032a5e 9cfaccfb5cff36a6dd4d046b179afcd2157482cf
```

La opción `-c` se limita a cada comando: no cambia configuración global,
compartida ni de los worktrees de origen. Los 169 archivos rastreados del
candidato de implementación coincidieron byte por byte con `git show HEAD:<path>`;
`git ls-files --eol` mostró LF en todos. El gate global `pnpm format:check` pasó
sin reformatear archivos. No se añadió `.gitattributes`, no se debilitó Prettier
y no se generaron diffs de finales de línea. Un futuro checkout con conversión
automática puede reproducir la discrepancia; debe preservar LF del mismo modo.
Los informes originales de las fases describen sus checkouts históricos y no
se reescriben para aparentar que entonces pasaban el gate global.

## Validación combinada ejecutada

Entorno local: Windows, Node `v24.15.0`, pnpm `11.25.0`. Un único coordinador
ejecutó las suites; no hubo pruebas simultáneas usando los puertos reservados.
Se comprobó disponibilidad de puertos y solo se iniciaron/detuvieron servidores
propios. Las pruebas del provider usan transportes simulados y relojes inyectados;
los E2E interceptan Jolpica sin recurrir al servicio público.

| Comando / comprobación                                                    | Resultado observado                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                          | PASS; lockfile sin cambios                                 |
| `pnpm format:check`                                                       | PASS global                                                |
| `pnpm typecheck`                                                          | PASS, incluyendo generación de tipos Next                  |
| `pnpm lint`                                                               | PASS, cero warnings                                        |
| `pnpm test`                                                               | PASS: **291 tests en 17 archivos**                         |
| `pnpm build`                                                              | PASS; build raíz nuevo antes de E2E                        |
| `CI=true pnpm test:e2e --output=test-results/root-e2e`                    | PASS: **22/22**, 2 workers, 29,8 s, sin retries utilizados |
| `CI=true pnpm test:e2e --retries=0 --output=test-results/root-e2e-repeat` | PASS: **22/22**, 2 workers, 28,9 s                         |
| Build aislado con `SECTOR_TELEMETRY_PREVIEW=1` según README               | PASS                                                       |
| Playwright con config de `telemetry-lab/validation`                       | PASS: **8/8**, 8,2 s                                       |
| Preview construido con flag, arrancado sin flag                           | HTTP **404**                                               |
| `git diff --check`                                                        | PASS                                                       |

Las dos ejecuciones raíz son 22 casos únicos ejecutados dos veces; no se suman
como nuevos casos. Los ocho del preview pertenecen a otra suite. Los 291 unit
tests proceden de la ejecución combinada, no de sumar informes de las fases.
Las capturas y diagnósticos permanecen ignorados bajo `test-results/root-e2e`,
`test-results/root-e2e-repeat` y `test-results/telemetry-lab-preview`.
No se incluyen builds, capturas, reportes de navegador ni credenciales en Git.

La repetición sin retries comprueba estabilidad junto al nuevo cooldown compartido.
Una comprobación adicional del preload verificó el anclaje de fecha de los
fixtures, avance real del tiempo, construcción y llamada de Date, parsing de
fechas explícitas, interceptación de fixtures y rechazo de red previsto.

## Compatibilidad Jolpica y fallos de producción

Se revisaron los consumidores existentes y el adapter integrado:

- LRU: 128 entradas retenidas, estimación global de 8 MiB y máximo de 2 MiB por
  entrada; lecturas mantienen entradas calientes. Objetos congelados recursivamente.
- TTL y stale conservan timestamps originales y techos de antigüedad. Errores
  no reemplazan datos válidos; empty/unavailable no se sirven como stale success.
- Reutilización calendario a evento conserva procedencia y expiración; la
  ausencia de un evento en el calendario no prueba su inexistencia.
- Dedupe en vuelo, colas acotadas, presupuesto por intento y reintentos con
  espera/jitter acotados permanecen internos. Cooldown 429 y 503 con Retry-After,
  fechas/duraciones largas, circuito progresivo y recuperación tienen pruebas.
- Fallos de red y timeout devuelven errores tipados y sanitizados. Finality,
  completeness y freshness siguen siendo dimensiones independientes.
- `DataResult` y `F1DataProvider` v1, singleton server-only y composición real
  de Overview/Race Center se conservan. No se introdujo fallback sintético.

Los E2E verificaron navegación Overview → Race Center → Overview, selección
compartible, resultados, qualifying sin sesión de calendario y sprint no soportado.
Además se arrancó el build raíz con un preload de **rechazo de red únicamente**,
sin fixtures ni `SECTOR_E2E`: las llamadas HTTPS a Jolpica rechazaban con un
detalle privado de prueba. Overview y Race Center mostraron el error sanitizado,
sin tablas ni muestras ni detalle privado. El proceso se cerró al terminar.
Esta comprobación prueba degradación local, no disponibilidad del proveedor real.

El limiter coordina solo una identidad de fetch en un módulo/proceso. Instancias,
reinicios y otros clientes bajo la misma IP no comparten presupuesto. La
coordinación distribuida, historia de cuota tras reinicio y plan de egress siguen
siendo **bloqueos explícitos de publicación**, según `OPERATIONS.md`.

## CI inspeccionado; ejecución alojada pendiente

El workflow escucha PR hacia main y pushes a main. Tiene `contents: read`,
checkout sin persistir credenciales y las cuatro acciones fijadas a SHA completos.
Se verificó la existencia y compatibilidad de inputs en los `action.yml` oficiales
de [checkout](https://raw.githubusercontent.com/actions/checkout/3d3c42e5aac5ba805825da76410c181273ba90b1/action.yml),
[setup-node](https://raw.githubusercontent.com/actions/setup-node/949feb2413d6458794dcd2491c4babbbce0c15c1/action.yml),
[pnpm/action-setup](https://raw.githubusercontent.com/pnpm/action-setup/73e46992e05b19abd31f2f3c20e0e7370d762115/action.yml)
y [upload-artifact](https://raw.githubusercontent.com/actions/upload-artifact/cf430e030ddbb5b0abf93d22962f4752f3646cd9/action.yml).

Node se fija a la línea 24; pnpm usa `packageManager` exacto `11.25.0`.
La instalación es congelada. Ejecuta formato, tipos, lint, unit tests, build,
instalación Chromium con dependencias del sistema y E2E contra ese build.
El job tiene timeout de 30 minutos y E2E de 10 minutos. Concurrencia por PR/ref:
un nuevo intento cancela el anterior solo para PR; pushes de main no se cancelan.
La subida de artefactos se limita a diagnósticos de E2E fallido, sin archivos
ocultos y con retención de siete días. No hay `pull_request_target`, secretos
de despliegue ni cambios de branch protection.

**No se ejecutó GitHub-hosted CI.** La inspección de YAML/acciones y las pruebas
locales no validan el runner Linux, descargas/cache remotas ni permisos efectivos
en GitHub. Se requiere un workflow real después de autorizar la publicación.

## Telemetry Lab: límites y evidencia

Los 21 archivos revisados están incluidos exactamente. No se sustituyó el
placeholder de `/telemetry-lab`. Incluso al arrancar la aplicación raíz con
`SECTOR_TELEMETRY_PREVIEW=1`, la ruta conservó el placeholder sin controles del
prototipo; una URL al directorio de validación devolvió 404. Los chunks de cliente
del build raíz no contienen los identificadores sintéticos del prototipo.

El host aislado existente es suficiente y se preservó. Su guard server-side exige
el flag también al arrancar, aunque se haya construido con él. No se añadió una
ruta pública ni una integración OpenF1. Los tipos son locales y
`CONTRACT_PROPOSAL.md` sigue siendo propuesta, sin aprobación contractual.

La suite aislada y el reviewer UX comprobaron 320/768/1440 px, ausencia de overflow,
controles nativos etiquetados, teclado, skip link, foco visible, recuperación de
estados y reduced motion. Los tests touch verificaron targets de al menos 44 px.
Se conservaron alternativas tabulares, faltantes `Unavailable`, cortes de trazas,
leyendas A/B y etiquetas sintéticas en los puntos de lectura. El delta de distancia
permanece indisponible; la resta escalar de tiempos no se presenta como alineación.
No se observaron solicitudes externas ni errores de página en el preview.

No hay dependencias runtime nuevas ni imports server-only en sus componentes
cliente; CSS Modules mantiene el alcance. El reviewer de seguridad comprobó
cinco ciclos de tabla: 99 filas al abrir y retirada al cerrar, cuatro SVG y 349
elementos DOM en reposo. Son observaciones acotadas, no benchmarks universales.

## Tribunal independiente del candidato combinado

Tres instancias nuevas inspeccionaron el mismo diff congelado de la base al HEAD
`075faef85da81e19097850427cfc3e808d498ad5`, limpio antes/después. Ninguna había
implementado el candidato. No editaron archivos/Git ni iniciaron servidores.
Sus permisos heredados permitían escritura: el carácter read-only fue una
instrucción de conducta, no un sandbox independiente.

| Lente / instancia nativa                        | Dictamen y evidencia propia                                                                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code_reviewer` — `/root/tribunal_code`         | PASS. Diff completo, caché/proyección/transporte, consumidores, contratos, CI/reloj, modelo/componentes/tests/host, LF y estado Git. Sin hallazgos.                        |
| `ux_reviewer` — `/root/tribunal_ux`             | PASS. Inspección de código y capturas Telemetry 320/768/1440/error, Overview 1440 y Race Center 320; Playwright sin artefactos contra el preview reservado. Sin hallazgos. |
| `security_reviewer` — `/root/tribunal_security` | PASS. CI/acciones oficiales, límites de provider/cache/retry/circuit/errors, aislamiento/imports/chunks y navegador sin artefactos para ciclos de tablas. Sin hallazgos.   |

UX verificó un h1 y un main, siete selects, controles de al menos 45 px de alto,
reconciliación driver/vuelta y leyendas, recuperación Enter hacia State preview,
tabla por teclado con tres faltantes, skip link, transiciones 0s y scroll auto con
reduced motion, y cero errores/requests externos. Seguridad corrigió una aserción
propia de conteo inmediato por polling de Playwright para esperar el render React;
no fue un defecto del producto. No hubo findings Critical/High/Medium/Low que
resolver ni hipótesis bloqueantes. Se solicitó reconfirmación de este único
añadido documental antes del commit de cierre; no cambió la implementación.

Los reviewers distinguieron los resultados propios de la evidencia de suites del
coordinador. No se realizó auditoría manual de lector de pantalla, validación en
dispositivos reales/Safari/Firefox ni auditoría completa de contraste/rendimiento.

## Manifiesto de cambios

Los primeros 30 archivos pertenecen a los commits de origen preservados; el
único cambio de integración adicional es este informe.

```text
.github/workflows/ci.yml
playwright.config.ts
tests/e2e/mock-jolpica.mjs
src/data/providers/jolpica/OPERATIONS.md
src/data/providers/jolpica/README.md
src/data/providers/jolpica/hardening.test.ts
src/data/providers/jolpica/index.ts
src/data/providers/jolpica/provider.test.ts
src/data/providers/jolpica/transport.ts
src/features/telemetry-lab/CONTRACT_PROPOSAL.md
src/features/telemetry-lab/DESIGN.md
src/features/telemetry-lab/HANDOFF.md
src/features/telemetry-lab/README.md
src/features/telemetry-lab/REVIEW.md
src/features/telemetry-lab/index.ts
src/features/telemetry-lab/model.test.ts
src/features/telemetry-lab/model.ts
src/features/telemetry-lab/telemetry-lab.module.css
src/features/telemetry-lab/telemetry-lab.test.tsx
src/features/telemetry-lab/telemetry-lab.tsx
src/features/telemetry-lab/trace-chart.tsx
src/features/telemetry-lab/validation/.gitignore
src/features/telemetry-lab/validation/README.md
src/features/telemetry-lab/validation/app/layout.tsx
src/features/telemetry-lab/validation/app/page.tsx
src/features/telemetry-lab/validation/next.config.mjs
src/features/telemetry-lab/validation/package.json
src/features/telemetry-lab/validation/playwright.config.ts
src/features/telemetry-lab/validation/telemetry-lab.spec.ts
src/features/telemetry-lab/validation/tsconfig.json
docs/PHASE_02D_INTEGRATION.md
```

## Recomendación y límites de release

**GO técnico para publicar la rama y abrir un PR, únicamente tras autorización
separada.** Los gates locales requeridos pasan y las tres lentes aprueban el
candidato. No se ha publicado ni autorizado implícitamente una release.

**NO-GO para despliegue público** mientras falten coordinación de cuotas/IP y
reinicios, revisión de derechos/redistribución y atribución/licencias consumibles
por el público. Los notices existentes no acreditan aprobación legal ni sustituyen
la revisión de enlaces/avisos de atribución descrita en `OPERATIONS.md`.
Se deben reverificar términos/cuotas antes de release. GitHub-hosted CI aún
necesita su primera ejecución real. Telemetría real exige contrato aprobado,
provider validado, mappings y algoritmo de alineación independientes; esta fase
no los implementa ni publica el prototipo sintético como datos reales.
