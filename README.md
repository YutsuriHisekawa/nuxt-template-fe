<div align="center">

<img src="public/logo.webp" alt="Endfield Logo" width="120" />

# Endfield

**Enterprise CRUD Builder & Management System**

*Generate full-stack CRUD pages in seconds — not hours.*

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.3-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![AG Grid](https://img.shields.io/badge/AG_Grid-32.3-0084C7?style=for-the-badge)](https://www.ag-grid.com)

<img src="https://media.tenor.com/nIXUxsD5xN4AAAAC/angelina-gilberta.gif" alt="Let's Go!" width="300" />

</div>

---

## Overview

**Endfield** adalah frontend framework internal berbasis **Nuxt 4** yang dirancang untuk mempercepat development CRUD page secara drastis. Cukup jalankan satu command, konfigurasi field lewat visual builder, dan halaman Landing + Form langsung ter-generate — lengkap dengan validasi, detail tabs, dan integrasi API.

## Key Features

| Feature | Description |
|---|---|
| **Visual Page Builder** | Drag & configure fields, detail tabs, dan preview secara real-time |
| **Auto Code Generation** | Generate Landing (AG Grid) + Form page dari builder config |
| **Detail Tabs** | Multi-detail support dengan `ButtonMultiSelect` atau `Add to List` mode |
| **with-details API** | Auto-detect detail → pakai `/with-details` endpoint untuk create/update |
| **Cookie Persistence** | Builder state tersimpan di cookie, aman dari refresh |
| **Dark/Light Theme** | Full theme support termasuk AG Grid theme switching |
| **50+ UI Components** | shadcn-vue based — accordion, dialog, drawer, tabs, dan lainnya |
| **Custom Field Types** | Text, Number, Textarea, Select, Switch, Checkbox, Space, dan extendable |

<div align="center">
<img src="https://media.tenor.com/xVmg3tvcW0QAAAAC/endmin-endministrator.gif" alt="Endfield Admin" width="280" />
</div>

## Tech Stack

```
Frontend     Nuxt 4 + Vue 3 + TypeScript
Styling      Tailwind CSS 4 + shadcn-vue (reka-ui)
Data Grid    AG Grid Community 32
State        Pinia + useCookie
Animation    @vueuse/motion
Icons        Lucide Vue Next
API          useApi() composable → REST backend
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env_example .env
```

Edit `.env` sesuai backend URL:

```env
NUXT_PUBLIC_BASE_URL=https://your-api-server.com:8002
```

### 3. Start Development Server

```bash
pnpm dev
```

Aplikasi berjalan di **http://localhost:5731**

---

## Page Builder — Generate CRUD dalam Hitungan Detik

### Step 1: Jalankan Route Generator

```bash
node add_route.cjs setup/m_supplier
```

Output:

```
---------------------------------------
  Endfield Route Builder
---------------------------------------
  Module : setup/m_supplier
  API    : m_supplier
  Route  : /setup/m_supplier
---------------------------------------
  → Buka browser: http://localhost:5731/builder_file
```

### Step 2: Konfigurasi di Visual Builder

Buka `/builder_file` di browser → tambah field, atur tipe, label, validasi, detail tabs → klik **Generate**.

### Step 3: Done!

Dua file otomatis dibuat:

```
app/pages/setup/m_supplier/index.vue      ← Landing page (AG Grid)
app/pages/setup/m_supplier/form/[[id]].vue ← Form page (CRUD)
```

---

## Project Structure

```
endfield/
├── app/
│   ├── components/
│   │   ├── builder/          # Visual page builder components
│   │   ├── button/           # Action buttons (Multi-Select, CRUD, Export, Print)
│   │   ├── field/            # Form fields (Text, Number, Select, Textarea, etc.)
│   │   ├── table/            # DataTable & DataTableMultiSelect (AG Grid)
│   │   └── ui/               # 50+ shadcn-vue base components
│   ├── composables/
│   │   └── useApi.js         # API wrapper with auth token
│   ├── layouts/
│   │   └── default.vue       # Sidebar + main layout
│   ├── pages/                # File-based routing
│   ├── stores/
│   │   └── auth.js           # Pinia auth store
│   └── utils/
│       └── builder/          # Field registry & builder utilities
├── server/
│   ├── api/builder/          # Generate API endpoint
│   └── utils/builder/        # Server-side field registry
├── template/
│   ├── Form.vue.tpl          # Form page template
│   └── Landing.vue.tpl       # Landing page template
└── public/
    └── logo.webp             # Endfield logo
```

## Generated API Pattern

Setiap form yang di-generate mengikuti pattern yang rapi dan mudah di-customize:

```js
// ============================================================================
// API CONFIG — sesuaikan param di sini jika ada perubahan
// ============================================================================
const API_BASE = "/api/dynamic/m_role";
const API_SAVE = API_BASE + "/with-details"; // otomatis jika ada detail

const getByIdParams = {
  join: true,     // join relasi saat GET by ID
};

// ============================================================================
// API FUNCTIONS
// ============================================================================
const getById = async (id) => {
  const qs = new URLSearchParams(getByIdParams).toString();
  return await api.get(`${API_BASE}/${id}${qs ? `?${qs}` : ''}`);
};

const createData = async (payload) => {
  return await api.post(API_SAVE, payload);
};

const updateData = async (id, payload) => {
  return await api.put(`${API_SAVE}/${id}`, payload);
};
```

> **Programmer tinggal ubah `getByIdParams`** untuk menambah parameter seperti `include`, `filter`, dll — semua terpusat di satu tempat.

## Available Field Types

| Type | Component | Description |
|---|---|---|
| `text` | `FieldX` | Standard text input |
| `number` | `FieldNumber` | Numeric input |
| `textarea` | `FieldTextarea` | Multi-line text |
| `select` | `FieldSelect` | Dropdown select |
| `select_creatable` | `FieldSelectCreatable` | Select with create option |
| `switch` | `Switch` | Boolean toggle |
| `checkbox` | `FieldBox` | Checkbox |
| `space` | — | Layout spacer (grid gap) |

<div align="center">
<img src="https://media.tenor.com/TcbIDOJY9CcAAAAC/absolute-cinema-absolute-cinema-meme.gif" alt="Absolute Cinema" width="300" />

*When your CRUD page generates perfectly on the first try*
</div>

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (port 5731) |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `node add_route.cjs <path>` | Generate builder config & open builder |

---

<div align="center">

**Built with caffeine and determination.**

<img src="https://media.tenor.com/nIXUxsD5xN4AAAAC/angelina-gilberta.gif" alt="Endfield" width="200" />

*Endfield — FAHRIZAL*

</div>
