# GitHub Kılavuzu — Tabu Projesi

> Bu belge, projeyi GitHub'a atmak, branch stratejisi, PR süreci ve CI/CD otomasyonunu adım adım açıklar.

---

## İçindekiler

1. [İlk Kez GitHub'a Push](#1-i̇lk-kez-githuba-push)
2. [Branch Stratejisi](#2-branch-stratejisi)
3. [Merge mi, Rebase mi? Main'e Ne Zaman?](#3-merge-mi-rebase-mi-maine-ne-zaman)
4. [Profesyonel PR Süreci](#4-profesyonel-pr-süreci)
5. [GitHub Actions CI/CD](#5-github-actions-cicd)
6. [GitHub Secrets Ayarları](#6-github-secrets-ayarları)
7. [Günlük Çalışma Akışı](#7-günlük-çalışma-akışı)
8. [Git Worktree — Paralel Branch Çalışması](#8-git-worktree--paralel-branch-çalışması)

---

## 1. İlk Kez GitHub'a Push

### Adım 1 — Git'i başlat ve ilk commit

```bash
# Proje klasörüne git
cd d:\gemini_tabu_test\geminitabu\newnextjs

# Git reposunu başlat
git init

# Varsayılan branch adını main yap
git branch -M main

# Tüm dosyaları stage'e al
git add .

# Ne ekleneceğini ve ne atlandığını kontrol et
git status

# İlk commit
git commit -m "chore: initial commit"
```

### Adım 2 — GitHub'da repo oluştur

1. [github.com/new](https://github.com/new) adresine git
2. Repository adı: `tabu` (veya istediğin isim)
3. **Private** seç (oyun projen halka açık olmayabilir)
4. `README`, `.gitignore`, `license` **ekleme** (hepsini biz zaten yaptık)
5. "Create repository" tıkla

### Adım 3 — Remote ekle ve push yap

```bash
# GitHub'ın sana gösterdiği URL ile remote ekle
git remote add origin https://github.com/KULLANICI_ADIN/REPO_ADIN.git

# İlk push
git push -u origin main
```

> ⚠️ **Önemli:** `.env` dosyası `.gitignore`'da — push etme. Sadece `.env.example` gidecek.

---

## 2. Branch Stratejisi

Profesyoneller direkt `main`'e push yapmaz. Kullanacağımız model:

```
main          ← üretim kodu (canlı sunucu buradan deploy edilir)
  │
  └─ develop  ← test/staging kodu (özellikler burada birleştirilir)
       │
       ├─ feature/oyun-sesi
       ├─ feature/i18n-ingilizce
       ├─ fix/timeout-bug
       └─ chore/dependency-update
```

### Branch'leri oluştur

```bash
# develop branch'ini oluştur
git checkout -b develop
git push -u origin develop

# Yeni bir özellik için:
git checkout develop
git checkout -b feature/oyun-sesi
```

### Branch isimlendirme kuralı

| Prefix | Kullanım | Örnek |
|--------|----------|-------|
| `feature/` | Yeni özellik | `feature/i18n-ingilizce` |
| `fix/` | Hata düzeltme | `fix/socket-disconnect` |
| `chore/` | Bağımlılık, config | `chore/update-prisma` |
| `refactor/` | Kod iyileştirme | `refactor/page-components` |
| `docs/` | Sadece dokümantasyon | `docs/api-reference` |

---

## 3. Merge mi, Rebase mi? Main'e Ne Zaman?

### feature → develop: Squash Merge (önerilen)

```
feature/oyun-sesi:  A──B──C
                             \
develop:             ────────●   ← 1 temiz commit (squash)
```

Feature dalında 10 commit yaptıysan ("wip", "fix typo"...), bunların hepsini develop'a taşımak gereksiz karmaşıklık yaratır. **Squash merge** tüm değişiklikleri tek, anlamlı bir commit haline getirir.

```bash
# GitHub PR'da: "Squash and merge" seçeneğini kullan
# Veya terminalde:
git checkout develop
git merge --squash feature/oyun-sesi
git commit -m "feat: oyun sesi seçeneği eklendi"
git push origin develop
```

### develop → main: Merge Commit (geçmiş korunsun)

```
develop:  ──●──●──●
                    \
main:      ──────────M   ← merge commit (hangi release olduğu belli)
```

develop → main geçişinde `--no-ff` (no fast-forward) kullanmak **release geçmişini** korur. Bir şey bozulursa o release commit'e geri dönebilirsin.

```bash
# PR'da: "Create a merge commit" seçeneğini kullan
# Veya terminalde:
git checkout main
git merge --no-ff develop -m "release: v1.2.0 — oyun sesi, i18n"
git push origin main
git tag v1.2.0  # opsiyonel ama iyi pratik
git push origin v1.2.0
```

### Rebase ne zaman kullanılır?

Rebase, branch geçmişini "sanki başka branch'te hiç olmamış gibi" yeniden yazarak **doğrusal bir tarih** oluşturur. Tek kişilik projelerde veya feature dalını develop'taki yeni değişikliklerle güncellemek için kullanışlıdır.

```bash
# feature dalındayken develop'u temel al:
git rebase develop
```

> ⚠️ **Kural:** `main` veya `develop` gibi paylaşımlı branch'lere **asla** `git push --force` / rebase yapma. Sadece kendi feature dalında kullan.

---

### Main'e Ne Zaman Merge Edilir?

**Bütün proje bitmesini beklemeye gerek yok.** Profesyonel yaklaşım:

| Ne zaman? | Açıklama |
|---|---|
| **Stabil bir grup özellik hazır** | Birkaç özellik develop'ta teste tabi tutuldu, stabil → main'e al |
| **Bug fix acil** | Hotfix doğrudan main'den açılır, düzeltilir, hem main hem develop'a merge edilir |
| **Deployment planlanıyor** | Canlıya alacaksan develop → main PR'ı açarsın |
| **Proje bitişi değil** | Ana kural: main'deki kod her zaman canlıya alınabilir halde olmalı |

```
Kötü: develop'ta 3 ay biriktir, sonra main'e dök → dev hell
İyi: Her 1-2 hafta stabil özellikleri main'e al → predictable
```

---

## 4. Profesyonel PR Süreci

### Evet, profesyoneller direkt push yapmaz!

PR (Pull Request) süreci şöyle işler:

```
1. feature/xxx branch'inden çalışırsın
2. Bitince push yaparsın
3. GitHub'da PR açarsın → develop'a merge için
4. CI otomatik çalışır (lint, tip kontrolü, build)
5. ✅ CI geçerse merge edilebilir
6. develop birikince → main'e PR açılır (production deploy)
```

### Commit mesajı kuralı (Conventional Commits)

```bash
# Format: <type>: <kısa açıklama>
git commit -m "feat: oyun sesi seçeneği eklendi"
git commit -m "fix: socket disconnect sonrası oda silinmiyordu"
git commit -m "refactor: page.tsx alt componentlere bölündü"
git commit -m "chore: zod bağımlılığı eklendi"
git commit -m "docs: security.md güncellendi"
```

### PR Description şablonu

GitHub'da `Settings → General → Features → Projects` altında PR template ekleyebilirsin:

**`.github/PULL_REQUEST_TEMPLATE.md`** dosyası otomatik dolar:

```markdown
## Ne yaptım?
<!-- Kısaca açıkla -->

## Test ettim mi?
- [ ] Manüel test
- [ ] `npm run lint` temiz
- [ ] `npx tsc --noEmit` hatasız

## Ekran görüntüsü (UI değişikliği varsa)
```

---

## 5. GitHub Actions CI/CD

`.github/workflows/ci.yml` dosyasını zaten oluşturduk. Her PR ve push'ta otomatik çalışır:

```
Push / PR açıldığında
      │
      ▼
┌─────────────────────────┐
│  Job 1: lint-typecheck  │  ← TSC + ESLint (~1-2 dk)
└─────────────┬───────────┘
              │ başarılı
              ▼
┌─────────────────────────┐
│  Job 2: build           │  ← MySQL + Prisma + next build (~3-5 dk)
└─────────────────────────┘
```

> **Yeşil ✅ = merge edilebilir | Kırmızı ❌ = önce düzelt**

---

## 6. GitHub Secrets Ayarları

CI'da `AUTH_SECRET` gibi değerler için:

1. Repo sayfasında **Settings → Secrets and variables → Actions**
2. **New repository secret** tıkla
3. Ekle:

| Name | Value |
|------|-------|
| `AUTH_SECRET` | 32+ karakterli güçlü random string |

Secret'ı üretmek için:

```bash
# PowerShell'de:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Veya online: https://generate-secret.vercel.app/32
```

---

## 7. Günlük Çalışma Akışı

```bash
# 1. develop'ten yeni branch aç
git checkout develop
git pull origin develop
git checkout -b feature/yeni-ozellik

# 2. Kodunu yaz...

# 3. Değişiklikleri commit'le
git add .
git commit -m "feat: yeni özellik eklendi"

# 4. GitHub'a push
git push origin feature/yeni-ozellik

# 5. GitHub'da PR aç: feature/yeni-ozellik → develop
# (GitHub otomatik link önerir terminalde)

# 6. CI geçince merge et
# 7. Local'de branch sil
git checkout develop
git pull origin develop
git branch -d feature/yeni-ozellik
```

---

## Özet: İlk Push Komutu Sırası

```bash
git init
git branch -M main
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/KULLANICI/REPO.git
git push -u origin main

# Sonra develop branch'ini oluştur:
git checkout -b develop
git push -u origin develop
```

Artık her `feature/` → `develop` → `main` akışında CI otomatik devreye girer.

---

## 8. Git Worktree — Paralel Branch Çalışması

### Worktree nedir?

Normalde bir Git reposunda **aynı anda sadece bir branch'te** çalışabilirsin. Başka bir branch'e geçmek istediğinde `git stash` veya commit yapman gerekiyor. **Worktree**, aynı reponun birden fazla branch'ini **ayrı klasörler** olarak aynı anda açık tutmana izin verir — kopyalama olmadan, tek `.git` paylaşılır.

```
newnextjs/              ← main branch'in çalıştığı ana klasör
newnextjs-develop/      ← develop branch'inin bağlı olduğu worktree
newnextjs-feature-ses/  ← feature/oyun-sesi branch'inin worktree'si
```

### Ne zaman kullanılır?

- Bir özellik üzerinde çalışırken acil bir bug geldi → stash gerekmez, diğer worktree'yi aç
- Aynı anda 2 farklı PR'a bakman gerekiyor
- `npm run dev` ile bir branch'i çalışır tutarken başka branch'te kod yazmak istiyorsun

### Temel Komutlar

```bash
# Mevcut worktree'leri listele
git worktree list

# develop branch'i için yeni klasörde worktree aç
git worktree add ../newnextjs-develop develop

# Henüz olmayan yeni bir branch ile worktree aç
git worktree add ../newnextjs-feature-ses -b feature/oyun-sesi

# Worktree'yi sil (branch'i silmez)
git worktree remove ../newnextjs-develop

# Bozuk worktree kayıtlarını temizle
git worktree prune
```

### Pratik Senaryo

```bash
# 1. i18n özelliği üzerinde çalışıyorsun
cd d:\gemini_tabu_test\geminitabu\newnextjs   # feature/i18n branch'i

# 2. Acil bug geldi — stash YOK, sadece:
git worktree add ../tabu-hotfix -b fix/socket-crash
cd ../tabu-hotfix
# → burada tamamen bağımsız çalışıyorsun
npm install      # her worktree kendi node_modules'ine ihtiyaç duyar!
npm run dev      # farklı port kullanmak gerekebilir (PORT=3001)

# 3. Bug'ı düzelt, commit yap, push yap
git add .
git commit -m "fix: socket crash on empty room"
git push origin fix/socket-crash

# 4. i18n'e geri dön — hiçbir şey kaybolmadı
cd ..\newnextjs
```

### Worktree ile Port Çakışması

Her worktree'de `npm run dev` çalıştırmak istersen aynı port kullanırlar. `.env.local` ile farklı port ver:

```bash
# tabu-hotfix klasöründe bir .env.local oluştur:
PORT=3001
```

### Önemli Notlar

| Kural | Açıklama |
|---|---|
| Her worktree ayrı `node_modules` ister | `npm install` her birinde yapılmalı |
| Prisma generate | Her worktree'de ayrı çalıştır |
| Aynı branch 2 worktree'de açılamaz | Her worktree farklı branch olmalı |
| `.git` klasörü paylaşılır | Disk kapladığı yer az — bu worktree'nin avantajı |



