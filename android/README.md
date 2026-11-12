# Vocalis Android App (APK + PWA)

Este diretório contém o projeto nativo **Android Studio (Kotlin)** do **Vocalis**, integrado 100% com todas as funcionalidades do aplicativo Web:

- Biofeedback vocal em tempo real via microfone (`RECORD_AUDIO`)
- Cache local persistente offline via `IndexedDB` + `localStorage`
- Lembretes com notificações Android (`POST_NOTIFICATIONS`) e vibração háptica (`VIBRATE`)
- Tela sempre ativa (`FLAG_KEEP_SCREEN_ON`) durante sessões de treino vocal
- Exportação e compartilhamento nativo de relatórios clínicos `.pdf` via `FileProvider` (WhatsApp, Gmail, Drive)
- Vídeos demonstrativos do YouTube e Dica Vocal personalizada via Gemini

## Como gerar o `.apk` no Android Studio

1. Na raiz do projeto, gere e sincronize os arquivos Web para os assets do Android:
   ```bash
   npm run android:sync
   ```
2. Abra a pasta `android/` no **Android Studio**.
3. Aguarde a sincronização do Gradle e clique em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

## Instalação instantânea no Android (sem precisar compilar APK)

Você também pode instalar o Vocalis diretamente pelo **Google Chrome no Android** abrindo a URL do aplicativo e clicando em **Instalar App** no cabeçalho (ou **⋮ > Instalar aplicativo** no navegador).
