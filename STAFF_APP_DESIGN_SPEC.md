# VaccinKids STAFF — UI/UX Design Specification

> **How to use this document**
> Every color, radius, shadow and spacing value is defined once in the **Design Tokens** section.
> Screen specs reference only token names — never raw hex values — so the entire palette can be
> changed in one place without hunting through ten screens.

---

## 0. Design Tokens

### 0.1 Color Palette

```
/* ── Brand ──────────────────────────────────────────────── */
--color-brand-teal-dark    : #0D6460   /* pressed / deep shadow       */
--color-brand-teal         : #0F766E   /* primary action, headers     */
--color-brand-teal-light   : #CCFAF6   /* backgrounds, tints          */
--color-brand-teal-xlight  : #F0FDFB   /* page surface tint           */

/* ── Accent ─────────────────────────────────────────────── */
--color-accent-coral       : #F26B5B   /* Kids wordmark, highlights   */
--color-accent-coral-light : #FDECEA   /* coral badge backgrounds     */
--color-accent-lavender    : #7C6FCD   /* admin/stats accent          */
--color-accent-lavender-light: #EDE9FF /* lavender badge backgrounds  */
--color-accent-blue        : #3B82F6   /* info, RDV accent            */
--color-accent-blue-light  : #DBEAFE   /* blue badge backgrounds      */

/* ── Semantic Status ─────────────────────────────────────── */
--color-success            : #16A34A   /* Confirmé, Vacciné           */
--color-success-light      : #DCFCE7
--color-warning            : #D97706   /* En attente                  */
--color-warning-light      : #FEF3C7
--color-danger             : #DC2626   /* Absent, Stock faible        */
--color-danger-light       : #FEE2E2
--color-info               : #0284C7   /* Rappel, Notification bleue  */
--color-info-light         : #E0F2FE

/* ── Neutrals ────────────────────────────────────────────── */
--color-white              : #FFFFFF
--color-surface            : #FAFAFA   /* card background             */
--color-background         : #F4F4F5   /* page / screen background    */
--color-border             : #E4E4E7   /* input, card borders         */
--color-text-primary       : #111827   /* headings, bold labels       */
--color-text-secondary     : #6B7280   /* subtitles, labels           */
--color-text-hint          : #9CA3AF   /* placeholder, timestamps     */
--color-overlay-dark       : rgba(0,0,0,0.55)  /* modal backdrop      */

/* ── Gradient (Admin banner) ─────────────────────────────── */
--gradient-admin-banner    : linear-gradient(135deg, #7C6FCD 0%, #3B82F6 100%)
--gradient-teal-banner     : linear-gradient(135deg, #0F766E 0%, #0D9488 100%)
```

### 0.2 Typography

| Token | Weight | Size | Use |
|---|---|---|---|
| `--text-display` | 700 | 32 sp | KPI numbers, hero figures |
| `--text-headline-lg` | 700 | 22 sp | Screen titles |
| `--text-headline-md` | 700 | 18 sp | Card headings, names |
| `--text-headline-sm` | 600 | 16 sp | Section titles |
| `--text-body-lg` | 400 | 16 sp | Main body content |
| `--text-body-md` | 400 | 14 sp | Secondary content, subtitles |
| `--text-body-sm` | 400 | 13 sp | Labels, timestamps |
| `--text-caption` | 400 | 11 sp | Badges, hints |

Font family: **Inter** (fallback: system-ui)

### 0.3 Spacing Scale

```
--space-2   : 2 dp
--space-4   : 4 dp
--space-6   : 6 dp
--space-8   : 8 dp
--space-12  : 12 dp
--space-16  : 16 dp
--space-20  : 20 dp
--space-24  : 24 dp
--space-32  : 32 dp
--space-40  : 40 dp
--space-48  : 48 dp
```

### 0.4 Border Radius

```
--radius-sm   : 6 dp    /* inputs, small badges      */
--radius-md   : 12 dp   /* cards                     */
--radius-lg   : 16 dp   /* large cards, sheets       */
--radius-xl   : 24 dp   /* banners, hero cards       */
--radius-pill : 999 dp  /* buttons, chips            */
--radius-full : 50 %    /* avatars, FAB              */
```

### 0.5 Shadows

```
--shadow-card   : 0 1dp 4dp rgba(0,0,0,0.08), 0 0 1dp rgba(0,0,0,0.04)
--shadow-sheet  : 0 -2dp 12dp rgba(0,0,0,0.10)
--shadow-button : 0 4dp 12dp rgba(15,118,110,0.30)
--shadow-fab    : 0 4dp 12dp rgba(0,0,0,0.20)
```

### 0.6 Reusable Components

#### Status Badge
| Status | Background | Text |
|---|---|---|
| Confirmé | `--color-success-light` | `--color-success` |
| En attente | `--color-warning-light` | `--color-warning` |
| Absent | `--color-danger-light` | `--color-danger` |
| Rappel DTC / ROR | `--color-warning-light` | `--color-warning` |

Radius: `--radius-pill` · Padding: `--space-4` × `--space-8` · Font: `--text-caption` weight 600

#### Avatar
- Size S: 32 dp · Size M: 44 dp · Size L: 56 dp
- Shape: `--radius-full`
- Border (profile header): 2 dp `--color-brand-teal`

#### Primary Button (Pill)
- Height: 52 dp · Radius: `--radius-pill`
- Background: `--color-brand-teal`
- Text: `--color-white` · `--text-headline-sm`
- Shadow: `--shadow-button`
- Pressed: background `--color-brand-teal-dark`
- Disabled: opacity 0.45

#### Tab Bar (Bottom Navigation)
- Height: 64 dp (+ safe-area inset)
- Background: `--color-white`
- Top border: 1 dp `--color-border`
- Active icon + label: `--color-brand-teal`
- Inactive: `--color-text-hint`
- Label: `--text-caption`

#### Input Field
- Height: 52 dp · Radius: `--radius-sm`
- Border: 1 dp `--color-border` · focused: 2 dp `--color-brand-teal`
- Background: `--color-white`
- Padding: `--space-12` horizontal
- Label above: `--text-body-sm` `--color-text-secondary`
- Placeholder: `--color-text-hint`

---

## Screen 01 — Welcome (Onboarding)

### Purpose
First-launch onboarding gate. Introduces the brand and routes the user to the login flow.

### Layout — top to bottom

```
┌─────────────────────────────────────┐
│  Status Bar (9:41)                  │
│  ─────────────────────────────────  │
│                                     │
│         [ Logo Icon 72×72 ]         │
│    shape: --radius-xl               │
│    bg: rgba(255,255,255,0.20) on    │
│        --gradient-teal-banner       │
│    border: 2dp rgba(255,255,255,0.4)│
│                                     │
│  VaccinKids                         │  --text-display
│  "Vaccin" color: --color-brand-teal │
│  "Kids"   color: --color-accent-coral│
│                                     │
│  STAFF                              │  --text-body-sm uppercase
│  color: --color-brand-teal          │
│  letter-spacing: 3dp                │
│                                     │
│  ─────────────────────────────────  │
│  Bienvenue !                        │  --text-headline-lg
│  color: --color-text-primary        │
│                                     │
│  "Prenez soin de chaque enfant,     │  --text-body-md
│   protégez leur avenir."            │  color: --color-text-secondary
│                                     │
│  ┌──────────────────────────────┐   │
│  │   Illustration centrale      │   │  see details below
│  └──────────────────────────────┘   │
│                                     │
│  ● ○ ○ ○    Pagination dots         │  dot size 8dp, active ring 14dp
│  active: --color-brand-teal         │
│  inactive: --color-border           │
│                                     │
│  [         Commencer          ]     │  Primary Button
│                                     │
│       En savoir plus                │  --text-body-md underline
│       color: --color-brand-teal     │
│                                     │
│  ─ Safe area ─────────────────────  │
└─────────────────────────────────────┘
```

### Illustration specs
- Backdrop shape: large rounded heart, color `--color-brand-teal-light`, opacity 0.5
- Star sparkles: 4-pointed, color `#F59E0B` (amber-400), sizes 10–18 dp, scattered
- Nurse character: teal scrubs `--color-brand-teal`, stethoscope, female, dark hair in bun
- Child character: coral t-shirt `--color-accent-coral`, joyful expression
- Both characters centered inside the heart shape

### Onboarding dots
4 dots total. Dot 1 active = outline circle `--color-brand-teal` + filled inner dot.
Dots 2–4 = solid filled `--color-border`.

---

## Screen 02 — Login (Infirmier / Admin)

### Purpose
Dual-role login screen. A segment selector switches between Infirmier and Admin tabs.
Both tabs share the same layout; only labels and destination differ.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar (9:41)                  │
│                                     │
│  [background teal wave top-right]   │  decorative, --color-brand-teal-light
│  opacity 0.35, blur 40dp            │
│                                     │
│  Bon retour !                       │  --text-headline-lg
│  Connectez-vous à votre compte      │  --text-body-md --color-text-secondary
│                                     │
│  ╔═══════════════════════════════╗  │
│  ║ [ Infirmier ]   [  Admin  ]  ║  │  Segment / Tab Switcher
│  ╚═══════════════════════════════╝  │
│  outer bg: --color-background       │
│  radius: --radius-pill              │
│  active tab bg: --color-brand-teal  │
│  active tab text: --color-white     │
│  inactive text: --color-text-primary│
│                                     │
│  Email ou téléphone                 │  Input label
│  ┌───────────────────────────────┐  │
│  │ infirmier@vaccinkids.ma       │  │  Input field (placeholder style)
│  └───────────────────────────────┘  │
│                                     │
│  Mot de passe                       │  Input label
│  ┌─────────────────────────── 👁 ┐  │
│  │ ●●●●●●●●●●                    │  │  Password field + eye toggle
│  └───────────────────────────────┘  │
│                                     │
│  ☑ Se souvenir de moi              │  Checkbox + label (left)
│              Mot de passe oublié ?  │  --color-brand-teal link (right)
│                                     │
│  [        Se connecter         ]    │  Primary Button
│                                     │
│          ou continuer avec          │  --text-body-sm --color-text-hint
│                                     │
│            ┌───────┐               │
│            │  ( ) │               │  Biometric button
│            └───────┘               │  circular, size 56dp
│  bg: --color-white                 │
│  shadow: --shadow-fab               │
│  icon: fingerprint, 28dp black      │
│                                     │
└─────────────────────────────────────┘
```

### Segment switcher detail
- Container: 4 dp padding, `--radius-pill`, bg `--color-background`
- Active pill: `--color-brand-teal`, `--radius-pill`, text white, weight 600
- Inactive text: `--color-text-primary`, weight 400
- Transition: color animate 200 ms ease

### Checkbox style
- Size: 20×20 dp · Radius: `--radius-sm`
- Checked: bg `--color-brand-teal`, white tick icon
- Unchecked: border 1.5 dp `--color-border`

### Biometric button
- Size: 56×56 dp · `--radius-full`
- Background: `--color-white`
- Shadow: `--shadow-fab`
- Icon: fingerprint 28 dp, color `--color-text-primary`

---

## Screen 03 — Dashboard Infirmier

### Purpose
Daily operations overview. Shows KPIs, the next appointment, and the primary QR scan CTA.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar (9:41)                  │
│                                     │
│  [Avatar 44dp]  Bonjour,            │  --text-body-md --color-text-secondary
│                 Infirmier Samira    │  --text-headline-md
│          Centre de santé Al Amal ▾  │  --text-body-sm + chevron dropdown
│                                     │
│  ┌──────────────────────────────┐   │
│  │  Aujourd'hui    [calendar✦] │   │  Hero Banner Card
│  │  15 Mai 2025                │   │  bg: --gradient-teal-banner
│  │                             │   │  radius: --radius-xl
│  │  4                          │   │  shadow: --shadow-card
│  │  Sessions actives           │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │  KPI Row (4 cards)
│  │ 📅  │ │ ✓   │ │ 🕐  │ │ ✗  │ │
│  │  32 │ │  18 │ │  7  │ │ 3  │ │
│  │RDV  │ │Vacc.│ │Att. │ │Abs.│ │
│  └──────┘ └──────┘ └──────┘ └────┘ │
│  icon colors: blue/green/orange/red │
│  number colors: matching icon       │
│                                     │
│  Prochain RDV                       │  --text-headline-sm
│  ┌───────────────────────────────┐  │
│  │ [09:30]  Youssef Amine  [Rappel DTC] │  Card
│  │          2 ans, 3 mois        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ [⊡]        Scanner QR       │   │  Primary Button (teal)
│  └──────────────────────────────┘   │
│                                     │
│  ── Bottom Tab Bar (5 tabs) ──────  │  Accueil active
└─────────────────────────────────────┘
```

### Hero Banner specs
- Background: `--gradient-teal-banner`
- Radius: `--radius-xl`
- Padding: `--space-20`
- Calendar watermark: right side, opacity 0.15, white
- Title: `--text-headline-sm` white
- Date: `--text-body-md` rgba(255,255,255,0.75)
- Big number: `--text-display` white
- Sub-label: `--text-body-sm` rgba(255,255,255,0.75)

### KPI Card specs
- Width: equal (flex 1), gap `--space-8`
- Height: auto (min 72 dp) · Radius: `--radius-md` · Shadow: `--shadow-card`
- Icon size: 20 dp, inside colored circle 36 dp
- Number: `--text-headline-lg` matching accent color
- Label: `--text-caption` `--color-text-secondary`, 2 lines

| Card | Icon bg | Number color |
|---|---|---|
| RDV aujourd'hui | `--color-accent-blue-light` | `--color-accent-blue` |
| Vaccinés | `--color-success-light` | `--color-success` |
| En attente | `--color-warning-light` | `--color-warning` |
| Absents | `--color-danger-light` | `--color-danger` |

### Prochain RDV card
- Radius: `--radius-md` · Shadow: `--shadow-card`
- Time chip: `--color-background`, `--radius-pill`, `--text-body-sm` weight 600
- Name: `--text-body-lg` weight 600
- Age: `--text-body-sm` `--color-text-secondary`
- Vaccine badge: `--color-warning-light` text `--color-warning`

### Scanner QR button
- Height: 56 dp · Full width · `--radius-pill`
- Background: `--color-brand-teal`
- Left icon: QR grid 24 dp white
- Label: "Scanner QR" `--text-headline-sm` white weight 700

---

## Screen 04 — Liste des RDV

### Purpose
Filterable appointment list with search, status chips and per-patient cards.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│                                     │
│  ← Rendez-vous                      │  Back + title
│                                     │
│  ┌─────────────────────── ┐ [🔽]   │
│  │ 🔍  Rechercher un enfant...│     │  Search bar + filter button
│  └─────────────────────────┘        │
│                                     │
│  ──── Filter chips (scroll H) ────  │
│  [Tous 32] [Confirmés 18] [En attente 7] [Absents 3]
│                                     │
│  ── Card list (scroll V) ─────────  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │[09:30][Avatar] Youssef Amine  │  │  Card
│  │        2 ans, 3 mois [Rappel DTC]│  │
│  │                   [Confirmé ✓]│  │
│  └───────────────────────────────┘  │
│  (repeat for each patient)          │
│                                     │
│  ── Bottom Tab Bar (RDV active) ─── │
└─────────────────────────────────────┘
```

### Search bar specs
- Height: 48 dp · Radius: `--radius-md`
- Background: `--color-background`
- Border: 1 dp `--color-border`
- Icon: magnifier 18 dp `--color-text-hint`
- Placeholder: `--color-text-hint`

### Filter chip bar
- Horizontal ScrollView, no scroll indicator
- Chip height: 34 dp · Radius: `--radius-pill`
- Padding: `--space-8` × `--space-16`
- Active chip: bg `--color-brand-teal`, text white, weight 600
- Inactive chip: bg `--color-background`, text `--color-text-secondary`

### Filter button (top right)
- Size: 44×44 dp · `--radius-full`
- Background: `--color-white` · Shadow: `--shadow-card`
- Icon: funnel/filter 20 dp `--color-text-primary`

### Appointment card
- Radius: `--radius-md` · Shadow: `--shadow-card`
- Padding: `--space-16`
- Layout: `time | avatar + name+age+badge | status`
- Time: `--text-body-sm` weight 600, chip bg `--color-background`
- Name: `--text-body-lg` weight 600
- Age: `--text-body-sm` `--color-text-secondary`
- Vaccine badge: `--color-warning-light` · Status badge: see § 0.6

---

## Screen 05 — Scan QR

### Purpose
Camera viewfinder for scanning a child's health booklet QR code. Confirms identity with an overlay card.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│  ← Scan QR Code                    │
│  Scannez le QR code du carnet       │  --text-body-md --color-text-secondary
│         de santé                    │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  ╔══╗               ╔══╗   │   │  Camera viewfinder
│  │  ║  │               │  ║   │   │  bg: #000000
│  │  ╚══╝               ╚══╝   │   │  corner brackets: --color-brand-teal
│  │                             │   │  bracket stroke: 3dp, length 20dp
│  │   [ QR code illustration ]  │   │
│  │                             │   │
│  │  ╔══╗               ╔══╗   │   │
│  │  ║  │               │  ║   │   │
│  │  ╚══╝               ╚══╝   │   │
│  └──────────────────────────────┘   │
│                                     │
│              ( 🔦 )                │  Torch FAB
│  bg: --color-brand-teal             │
│  size: 56dp, --radius-full          │
│                                     │
│  ─────────────────────────────────  │
│  ┌──────────────────────────────┐   │  Detection card (appears on scan)
│  │[Avatar] Enfant détecté       │   │  bg: --color-brand-teal-dark
│  │         Youssef Amine        │   │  radius: --radius-lg
│  │         2 ans, 3 mois        │   │  shadow: --shadow-sheet
│  │                        [✓]  │   │  ✓ button: white circle, green tick
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Viewfinder specs
- Aspect ratio: 1:1 (square, 280 dp)
- Background: `#000000` (camera preview)
- Corner brackets: `--color-brand-teal` · stroke 3 dp · length 20 dp · `--radius-sm`
- Scanning animation: horizontal teal line sweeps top → bottom, 1.5 s loop

### Torch FAB
- Size: 56×56 dp · `--radius-full`
- Background: `--color-brand-teal`
- Icon: flashlight 24 dp white

### Detection overlay card
- Background: `--color-brand-teal-dark`
- Radius: `--radius-lg` · Padding: `--space-16`
- "Enfant détecté" label: `--text-caption` rgba(255,255,255,0.75)
- Name: `--text-body-lg` white weight 700
- Age: `--text-body-md` rgba(255,255,255,0.80)
- Confirm button: 36 dp circle, white bg, teal tick 20 dp
- Entry animation: slide up from bottom + fade, 250 ms ease-out

---

## Screen 06 — File d'Attente

### Purpose
Ordered waiting room queue. Nurse calls patients one by one with the CTA button.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│  File d'attente          [🔔]       │  Bell icon top right
│                                     │
│  [ En attente  7 ]  [  Appelés  12 ]│  Segment switcher
│                                     │
│  ── Numbered queue (scroll V) ────  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 1  [Avatar] Sanaa Lina        │  │  Queue card
│  │             2 ans, 5 mois     │  │
│  │             Arrivée 09:15     │  │
│  │                  [En attente] │  │
│  └───────────────────────────────┘  │
│  (repeat for positions 2, 3, 4…)    │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ (📣)  Appeler le prochain   │   │  Primary Button
│  └──────────────────────────────┘   │
│                                     │
│  ── Bottom Tab Bar (Attente active) ─│
└─────────────────────────────────────┘
```

### Queue card specs
- Radius: `--radius-md` · Shadow: `--shadow-card` · Padding: `--space-16`
- Position number: `--text-display` `--color-brand-teal` weight 700, left column 32 dp
- Avatar: 44×44 dp `--radius-full`
- Name: `--text-body-lg` weight 600 `--color-text-primary`
- Age: `--text-body-sm` `--color-text-secondary`
- Arrival time: `--text-caption` `--color-text-hint`
- Status badge: right-aligned, see § 0.6

### "Appeler le prochain" button
- Height: 56 dp · Full width · `--radius-pill`
- Background: `--color-brand-teal`
- Left icon: speaker / bullhorn 22 dp white
- Text: `--text-headline-sm` white weight 700
- Pressed: `--color-brand-teal-dark`

---

## Screen 07 — Enregistrement Vaccination

### Purpose
4-step stepper for recording a vaccination act. Screen shows Step 1 (child confirmed) with the form.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│  ← Enregistrement                   │
│                                     │
│  ①─────②─────③─────④              │  Stepper
│  Enfant  Vaccin  Détails  Confirmer │
│                                     │
│  ┌──────────────────────────────┐   │  Patient mini-card
│  │ [Avatar] Youssef Amine  [DTC]│   │  bg: --gradient-teal-banner
│  │          2 ans, 3 mois       │   │  radius: --radius-xl
│  └──────────────────────────────┘   │
│                                     │
│  Vaccin administré                  │  Input label
│  ┌───────────────────────── ▾  ┐   │  Dropdown
│  │ DTC — Diphtérie, Tétanos…   │   │
│  └───────────────────────────────┘  │
│                                     │
│  Type de dose                       │
│  ┌───────────────────────── ▾  ┐   │  Dropdown
│  │ Rappel 2                    │   │
│  └───────────────────────────────┘  │
│                                     │
│  Date d'administration              │
│  ┌───────────────────────── 📅 ┐   │  Date picker trigger
│  │ 15/05/2025                  │   │
│  └───────────────────────────────┘  │
│                                     │
│  Voie d'administration              │
│  (●) IM  ( ) SC                    │  Radio buttons
│                                     │
│  [          Suivant            ]    │  Primary Button
│                                     │
└─────────────────────────────────────┘
```

### Stepper component
- Step circle: 28 dp diameter
- Active: bg `--color-brand-teal`, number white weight 700
- Inactive: border 1.5 dp `--color-border`, number `--color-text-hint`
- Completed: bg `--color-brand-teal-light`, white tick
- Connector line: 1 dp `--color-border`, active segment `--color-brand-teal`
- Label below circle: `--text-caption`, active `--color-brand-teal`, inactive `--color-text-hint`

### Patient mini-card
- Background: `--gradient-teal-banner`
- Radius: `--radius-xl` · Padding: `--space-16`
- Avatar: 44 dp `--radius-full`
- Name: `--text-body-lg` white weight 700
- Age: `--text-body-md` rgba(255,255,255,0.80)
- Vaccine badge right: semi-transparent white bg, `--text-caption` white weight 600

### Dropdown / Date field
- Height: 52 dp · Radius: `--radius-sm`
- Border: 1 dp `--color-border`
- Chevron / calendar icon: `--color-text-secondary`
- Selected value: `--text-body-md` `--color-text-primary`

### Radio buttons
- Pair on one row, gap `--space-16`
- Selected: filled circle `--color-brand-teal` with inner white dot
- Unselected: border 1.5 dp `--color-border`
- Label: `--text-body-md` `--color-text-primary`

---

## Screen 08 — Courbe de Croissance

### Purpose
Pediatric growth chart for the selected child, switching between weight, height, and BMI.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│  ← Courbe de croissance             │
│                                     │
│  [Avatar] Youssef Amine  [Garçon]   │  Patient header
│           2 ans, 3 mois             │
│                                     │
│  [ Poids ]  [ Taille ]  [  IMC  ]  │  Measure tab switcher
│                                     │
│  Poids (kg)                12.4 kg  │  axis label (left) + current (right)
│                     +0.8 kg depuis 1 mois  │  trend: --color-success, small
│                                     │
│  ┌──────────────────────────────┐   │  Chart area
│  │  20┤                        │   │  height ~200 dp
│  │  13┤         ●──●──●        │   │
│  │  10┤    ●──●               │   │
│  │   9┤ ●                    │   │
│  │   0┼──┬──┬──┬──┬──┬──     │   │
│  │    0m 6m 12m 18m 24m 30m   │   │
│  └──────────────────────────────┘   │
│                                     │
│  ● P3  ● P15  ● P50  ● P85  ● P97 │  Legend row
│                                     │
│  Dernière mesure: 12.4 kg    [ ＋ ]│  Footer + FAB
│  15/05/2025                         │
│                                     │
└─────────────────────────────────────┘
```

### Measure tab switcher
- Same visual as Screen 02 segment switcher
- Active tab: `--color-brand-teal`
- 3 segments: Poids / Taille / IMC

### Chart specs
- Background: `--color-white` inside card, radius `--radius-md`
- Percentile bands (background fill, low opacity 0.15):

| Band | Color |
|---|---|
| P3 | `--color-danger` |
| P15 | `--color-warning` |
| P50 | `--color-success` |
| P85 | `--color-accent-blue` |
| P97 | `#F59E0B` (amber) |

- Patient line: `--color-brand-teal`, stroke 2.5 dp
- Data nodes: filled circle 8 dp `--color-brand-teal`, white border 2 dp
- Axes: 1 dp `--color-border`
- Axis labels: `--text-caption` `--color-text-hint`

### Trend indicator
- Up arrow + value: `--color-success` weight 600 `--text-body-sm`
- Down: `--color-danger`

### FAB (add measurement)
- Size: 48×48 dp · `--radius-full`
- Background: `--color-brand-teal`
- Icon: plus 22 dp white
- Shadow: `--shadow-fab`

---

## Screen 09 — Notifications

### Purpose
Chronological feed of system notifications for the nurse (reminders, alerts, messages, sync status).

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│  Notifications                      │
│              Marquer tout comme lu  │  --color-brand-teal link, right
│                                     │
│  ── Notification cards (scroll V) ─ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ [Icon] Rappel de vaccine   10m │ │
│  │        Youssef Amine doit      │ │
│  │        recevoir son rappel DTC │ │
│  │        dans 15 jours.          │ │
│  └────────────────────────────────┘ │
│  (repeat for each notification)     │
│                                     │
│  ── Bottom Tab Bar (Plus active) ── │
└─────────────────────────────────────┘
```

### Notification card specs
- Radius: `--radius-md` · Shadow: `--shadow-card` · Padding: `--space-16`
- Layout: `icon (left 40dp) | title+body (flex) | time (right)`
- Unread: left border 3 dp `--color-brand-teal`, bg `--color-brand-teal-xlight`
- Read: no left border, bg `--color-white`
- Title: `--text-body-md` weight 600 `--color-text-primary`
- Body: `--text-body-sm` `--color-text-secondary`
- Time: `--text-caption` `--color-text-hint`

### Notification icon styles

| Type | Icon bg | Icon color |
|---|---|---|
| Rappel vaccin | `--color-accent-blue-light` | `--color-accent-blue` |
| Session modifiée | `--color-accent-lavender-light` | `--color-accent-lavender` |
| Stock faible | `--color-warning-light` | `--color-warning` |
| Nouveau message | `--color-info-light` | `--color-info` |
| Synchronisation | `--color-success-light` | `--color-success` |

Icon container: 40×40 dp, `--radius-md`
Icon size: 20 dp

---

## Screen 10 — Dashboard Admin

### Purpose
Macro view for the administrator: global KPIs across all centres, recent activity feed, and bird's-eye statistics.

### Layout

```
┌─────────────────────────────────────┐
│  Status Bar                         │
│                                     │
│  [Avatar] Bonjour,                  │
│           Admin Hassan              │
│                                     │
│  ┌──────────────────────────────┐   │  Global banner card
│  │  Aperçu global      [charts] │   │  bg: --gradient-admin-banner
│  │  Mai 2025           +12%     │   │  radius: --radius-xl
│  │                             │   │
│  │  1,248                      │   │  --text-display white
│  │  Enfants vaccinés           │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │  3 KPI cards
│  │   12    │ │   48    │ │   5   │ │
│  │ Centres │ │Infirmier│ │Session│ │
│  │ Actifs  │ │ Actifs  │ │Auj.   │ │
│  └─────────┘ └─────────┘ └───────┘ │
│                                     │
│  Activité récente                   │  --text-headline-sm
│  ┌──────────────────────────────┐   │
│  │ [🏥] Centre Al Amal         │   │  Activity row
│  │       156 vaccinations  10m  │   │
│  │ ─────────────────────────── │   │
│  │ [🏥] Centre Al Nour         │   │
│  │        98 vaccinations  25m  │   │
│  └──────────────────────────────┘   │
│                                     │
│  ── Bottom Tab Bar (4 tabs) ──────  │  Accueil / Centres / Stats / Plus
└─────────────────────────────────────┘
```

### Admin banner specs
- Background: `--gradient-admin-banner`
- Bar chart decoration: right side, white, opacity 0.20, 7 bars
- Trend badge: `+12%` small pill, rgba(255,255,255,0.20) bg, white text
- All text: white, same scale as nurse hero banner

### Admin KPI cards
- 3 cards, equal width, gap `--space-8`
- Radius: `--radius-md` · Shadow: `--shadow-card`

| Card | Number color |
|---|---|
| Centres Actifs | `--color-accent-lavender` |
| Infirmiers Actifs | `--color-brand-teal` |
| Sessions Aujourd'hui | `--color-accent-blue` |

### Activity row
- Divider: 1 dp `--color-border` between rows
- Icon bg: `--color-success-light`, icon `--color-success`, size 36 dp `--radius-sm`
- Centre name: `--text-body-md` weight 600
- Volume: `--text-body-sm` `--color-text-secondary`
- Time: `--text-caption` `--color-text-hint`

### Admin Tab Bar (4 tabs)
| Tab | Icon |
|---|---|
| Accueil | house |
| Centres | building |
| Stats | bar-chart |
| Plus | dots-horizontal |

---

## Navigation Flow

```
Welcome (onboarding)
    └── [Commencer]
            └── Login Screen
                    ├── [Se connecter] as Infirmier
                    │       └── Dashboard Infirmier (Screen 03)
                    │               ├── Tab: RDV    → Liste des RDV (04)
                    │               │       └── Tap patient → Scan QR (05)
                    │               │               └── Scan success → Enregistrement (07)
                    │               ├── Tab: Scan   → Scan QR (05)
                    │               ├── Tab: Attente → File d'attente (06)
                    │               └── Tab: Plus   → Notifications (09)
                    │                               → Courbe de croissance (08) [from patient card]
                    └── [Se connecter] as Admin
                            └── Dashboard Admin (Screen 10)
                                    ├── Tab: Centres → Gestion Centres
                                    ├── Tab: Stats   → Statistiques
                                    └── Tab: Plus    → ...
```

---

## Implementation Notes

1. **All colors via tokens** — Never use raw hex in component code. Reference token names so a palette swap requires editing only this file.
2. **Dark mode** — swap `--color-background → #18181B`, `--color-surface → #27272A`, `--color-white → #1C1C1E`, and invert text tokens. All brand/accent tokens stay the same.
3. **RTL (Arabic)** — Mirror all horizontal layouts. The login screen already supports AR locale; ensure `writingDirection: rtl` is toggled via the language flag in `AuthContext`.
4. **Accessibility** — Minimum touch target 44×44 dp. Badge text contrast ratio ≥ 4.5:1 verified against backgrounds above.
5. **Biometric fallback** — If `react-native-keychain` returns no biometric capability, hide the fingerprint button entirely; do not grey it out.
