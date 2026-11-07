# Phase 03A — tribunal y validación

Estado técnico: **GO para presentar el PR de contratos**, con la salvedad E2E concurrente indicada abajo. No autoriza push, PR, merge, despliegue ni publicación de datos reales.

## Baseline y alcance

- Baseline / HEAD durante revisión: `c886687a0070bfc9770f51464cde64b091291c01`.
- Rama: `codex/phase03-telemetry-contracts`.
- Worktree: `E:/CODIGO/FastDash-phase03-contracts`.
- Contrato independiente: `TELEMETRY_CONTRACT_VERSION = 1`; F1 v1 permanece intacto.
- Trece archivos de implementación/documentación congelados. El [manifiesto](TELEMETRY_SNAPSHOT.json) registra sus SHA-256. Este informe y el propio manifiesto son evidencia de coordinación añadida después del tribunal; no se incluyen en sus propios hashes.
- El commit local se crea después de la revisión. Su SHA se obtiene con `git log -1 --format=%H -- docs/TELEMETRY_REVIEW.md` y se comunica en el informe final; el HEAD del snapshot describe deliberadamente el estado previo al commit.

El main local estaba limpio y se sincronizó por fast-forward al baseline verificado. Se creó un worktree nuevo sin reutilizar ni borrar los existentes. Se preservaron dos documentos sin seguimiento en el antiguo worktree de contratos Phase 00.6. No se modificaron interfaces F1 v1, proveedores reales, rutas, navegación, UI, dependencias, lockfile ni CI en el diff.

El checkout de Windows materializó 150 archivos del baseline con CRLF. Se normalizaron sus finales de línea para ejecutar el chequeo LF existente. Antes de refrescar sus registros de índice se verificó que los bytes resultantes coincidían exactamente con cada blob HEAD; ninguno aporta cambios al commit. No se cambió configuración Git o Prettier para relajar comprobaciones.

## Candidatos e independencia

| Candidato   | Manifiesto SHA-256 original                                      | Resultado                                   |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------- |
| candidate-1 | a0dd50a9bed1c8b75fbf9cd44ef6946824dc1de61ece6b20d69f0fc408967e13 | Cambios solicitados: cuatro Medium y un Low |
| candidate-2 | f2729a0e26069faf49cbe1ca73c1db65d6ebee96a0936774ec1d9ebff59a527a | PASS código, UX y seguridad/QA              |

Los tres revisores nativos fueron instancias independientes de los autores: `code_reviewer`, `ux_reviewer` y `security_reviewer`. Verificaron los mismos trece hashes del candidato final. Sus instrucciones de sólo lectura fueron conductuales, no un sandbox independiente; no editaron archivos ni Git. El coordinador contrastó los hashes después de recibir sus informes.

El primer manifiesto temporal estaba bajo .next y fue eliminado por el build posterior; su identificador, hash e informes quedaron registrados en la sesión. El segundo se conservó fuera del directorio de build y se archiva aquí sin cambios de contenido. Los revisores inspeccionaron estáticamente fuentes, pruebas y documentación; código realizó además probes Node en memoria. No ejecutaron suites ni presentaron como propias las comprobaciones del coordinador. UX no afirmó inspecciones manuales de navegador, contraste o lector de pantalla; este diff no modifica UI.

## Hallazgos y disposición

| ID      | Severidad | Defecto confirmado                                                                                     | Corrección y verificación                                                                                                                                                                            |
| ------- | --------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CODE-01 | Medium    | La alineación ignoraba cobertura de límites e incertidumbre del reloj independientes de la completitud | Ambas dimensiones degradan la alineación cuando son parciales/desconocidas o no nulas. Regresiones conservan observaciones y diferencia escalar; probe independiente y re-revisión PASS              |
| CODE-02 | Medium    | La definición de M y K en la política de reducción era circular                                        | M contiene endpoints, bordes de huecos, transiciones y extremos globales por segmento. K se calcula después; extremos por bucket se añaden posteriormente. Re-revisión PASS                          |
| UX-01   | Medium    | El escenario vacío aplicaba presupuesto a muestras que no deberían existir                             | Se resuelve pertenencia de ambas selecciones antes de responder vacío y antes de proyectar muestras. Regresión con presupuesto mínimo de dos filas y segunda identidad desconocida. Re-revisión PASS |
| SEC-01  | Medium    | Un array disperso de canales evitaba la validación mediante some                                       | Enumeración densa y acotada; regresión de rechazo y conservación de canal válido. Re-revisión PASS                                                                                                   |
| SEC-02  | Low       | Un array disperso podía serializarse silenciosamente como filas null                                   | Rechazo de huecos y propiedades adicionales antes de serializar; regresiones directas y anidadas conservan arrays vacíos válidos. Re-revisión PASS                                                   |

No quedan hallazgos Critical, High, Medium o Low abiertos en el alcance revisado. No hubo aceptación implícita ni votación para desestimar findings.

## Comprobaciones del coordinador

| Comando / comprobación                                | Resultado final                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                   | PASS, reglas originales                                                                     |
| `pnpm typecheck`                                      | PASS                                                                                        |
| `pnpm lint`                                           | PASS, cero warnings                                                                         |
| `pnpm test`                                           | PASS: 19 archivos, 377 tests offline; 86 casos nuevos dedicados                             |
| `pnpm build`                                          | PASS, producción nueva                                                                      |
| `pnpm test:e2e --workers=1 --retries=0`               | PASS: 22/22, desktop y Chromium móvil, sobre el build nuevo                                 |
| Build guardado y Playwright del preview Telemetry Lab | PASS anterior: 8/8, teclado/touch/reduced motion y 320/768/1440 px; UI idéntica al baseline |
| Hashes, alcance Git y `git diff --check`              | Verificados por coordinador y tribunal                                                      |

El build y E2E del candidato corregido terminaron durante una interrupción del turno; se recuperaron BUILD_ID y .last-run.json con estado passed. Al reanudar se repitió E2E serial para obtener salida explícita: 22/22 sin reintentos. No se añadieron llamadas reales a OpenF1 a los tests. Los fixtures y relojes son deterministas.

### Salvedad material de QA

La ejecución inicial con seis workers produjo 20 aprobados y dos fallos: estado de qualifying no publicado y observación del loading móvil. El perfil CI existente de dos workers tuvo una ejecución 22/22, pero posteriormente produjo 21 aprobados y un fallo de loading móvil, también en sus reintentos. Las ejecuciones seriales completas aprobaron los 22 casos sin reintentos.

El servidor y sus presupuestos/cooldown son compartidos, y la observación de loading es transitoria; son mecanismos plausibles de interferencia, **no una causa raíz demostrada**. No se cambiaron tests E2E, configuración, aserciones ni workflows. Un PASS serial no certifica estabilidad de CI concurrente. Esta limitación debe figurar en el PR y requiere una corrección separada antes de afirmar que ese perfil está completamente verde. Los revisores no identificaron evidencia de un defecto de contratos introducido por esta tarea.

## Límites y handoff

No se implementaron HTTP OpenF1, caché, reducción de producción ni alineación por distancia. El contrato define sus obligaciones y límites; el proveedor de fixtures nunca es fallback productivo. La investigación oficial de OpenF1, alcance de cobertura y derechos pendientes se documenta en [TELEMETRY_CONTRACTS.md](TELEMETRY_CONTRACTS.md). Acceso público no equivale a derechos irrestrictos de redistribución.

[TELEMETRY_HANDOFF.md](TELEMETRY_HANDOFF.md) define propiedad y aceptación exactas para 03B y 03C. Ambos deben recibir el mismo SHA completo aprobado que contenga este commit; los streams siguen BACKLOG hasta esa aprobación. Composición, rutas, navegación, contratos/fixtures compartidos y configuración permanecen reservados al coordinador.

Los tres PASS permiten proponer el PR de contratos con la salvedad QA. No autorizan publicación de datasets, activación de una ruta, integración o release. Los derechos de publicación y garantías operativas del adaptador continúan pendientes.
