<script setup lang="js">
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-vue-next"

const stats = [
  {
    title: "Total Revenue",
    value: "Rp 2.4B",
    change: "+12.4%",
    trend: "up",
    icon: CircleDollarSign,
  },
  {
    title: "Operational Expense",
    value: "Rp 820M",
    change: "+6.1%",
    trend: "up",
    icon: ReceiptText,
  },
  {
    title: "Cash on Hand",
    value: "Rp 1.1B",
    change: "-3.2%",
    trend: "down",
    icon: PiggyBank,
  },
  {
    title: "Outstanding Invoices",
    value: "Rp 460M",
    change: "-8.5%",
    trend: "down",
    icon: CreditCard,
  },
]

const transactions = [
  {
    title: "Client retainer - Q1",
    time: "Today, 09:12",
    amount: "Rp 120,000,000",
    direction: "in",
  },
  {
    title: "Cloud infrastructure",
    time: "Yesterday, 18:40",
    amount: "Rp 36,400,000",
    direction: "out",
  },
  {
    title: "Marketing campaign",
    time: "Yesterday, 11:03",
    amount: "Rp 54,800,000",
    direction: "out",
  },
  {
    title: "Partner rebate",
    time: "Feb 6, 14:25",
    amount: "Rp 18,500,000",
    direction: "in",
  },
]

const budgets = [
  { name: "Ops & Infrastructure", used: 72 },
  { name: "Marketing", used: 58 },
  { name: "R&D", used: 41 },
  { name: "Customer Success", used: 64 },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p class="text-sm text-muted-foreground">Overview of finance and cashflow performance.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          Feb 2026
        </div>
        <button class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <TrendingUp class="size-4" />
          Export Report
        </button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">{{ stat.title }}</p>
          <component :is="stat.icon" class="size-5 text-muted-foreground" />
        </div>
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-2xl font-semibold">{{ stat.value }}</span>
          <span
            class="inline-flex items-center gap-1 text-xs"
            :class="stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'"
          >
            <component :is="stat.trend === 'up' ? ArrowUpRight : ArrowDownRight" class="size-3" />
            {{ stat.change }}
          </span>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">vs previous month</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="rounded-xl border border-border bg-card p-4 lg:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold">Cashflow Trend</h2>
            <p class="text-xs text-muted-foreground">Weekly net cashflow for the last 8 weeks</p>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="inline-flex items-center gap-1 text-emerald-500">
              <TrendingUp class="size-3" />
              +9.3%
            </span>
            <span class="text-muted-foreground">vs last period</span>
          </div>
        </div>
        <div class="mt-6 h-48 rounded-lg bg-muted/40">
          <div class="flex h-full items-end gap-2 px-4 pb-4">
            <div class="h-16 w-full rounded-md bg-primary/60" />
            <div class="h-24 w-full rounded-md bg-primary/70" />
            <div class="h-12 w-full rounded-md bg-primary/50" />
            <div class="h-32 w-full rounded-md bg-primary/80" />
            <div class="h-20 w-full rounded-md bg-primary/60" />
            <div class="h-28 w-full rounded-md bg-primary/70" />
            <div class="h-14 w-full rounded-md bg-primary/50" />
            <div class="h-36 w-full rounded-md bg-primary/90" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-4">
        <h2 class="text-base font-semibold">Budget Allocation</h2>
        <p class="text-xs text-muted-foreground">Monthly spend utilization</p>
        <div class="mt-6 space-y-4">
          <div v-for="item in budgets" :key="item.name" class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>{{ item.name }}</span>
              <span class="text-muted-foreground">{{ item.used }}%</span>
            </div>
            <div class="h-2 w-full rounded-full bg-muted/40">
              <div class="h-2 rounded-full bg-primary" :style="{ width: `${item.used}%` }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="rounded-xl border border-border bg-card p-4 lg:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold">Recent Transactions</h2>
            <p class="text-xs text-muted-foreground">Latest cash movements</p>
          </div>
          <button class="text-xs text-primary">View all</button>
        </div>
        <div class="mt-6 divide-y divide-border">
          <div v-for="item in transactions" :key="item.title" class="flex items-center justify-between py-3">
            <div>
              <p class="text-sm font-medium">{{ item.title }}</p>
              <p class="text-xs text-muted-foreground">{{ item.time }}</p>
            </div>
            <div class="flex items-center gap-2">
              <component
                :is="item.direction === 'in' ? ArrowUpRight : ArrowDownRight"
                class="size-4"
                :class="item.direction === 'in' ? 'text-emerald-500' : 'text-rose-500'"
              />
              <span class="text-sm font-semibold">{{ item.amount }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-4">
        <h2 class="text-base font-semibold">Risk Signals</h2>
        <p class="text-xs text-muted-foreground">Alerts from the last 30 days</p>
        <div class="mt-6 space-y-4">
          <div class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Late payments</span>
              <TrendingDown class="size-4 text-rose-500" />
            </div>
            <p class="mt-2 text-xs text-muted-foreground">3 invoices past due</p>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Runway outlook</span>
              <TrendingUp class="size-4 text-emerald-500" />
            </div>
            <p class="mt-2 text-xs text-muted-foreground">8.6 months available</p>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Utilization risk</span>
              <TrendingDown class="size-4 text-amber-500" />
            </div>
            <p class="mt-2 text-xs text-muted-foreground">Marketing over 70%</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
