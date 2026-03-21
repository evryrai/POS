<script setup lang="ts">
const dateParam = ref(new Date().toISOString().split('T')[0]) // YYYY-MM-DD

const { data, pending, refresh } = await useFetch('/api/reports/daily', {
  query: computed(() => ({ date: dateParam.value }))
})

const report = computed(() => data.value)

function downloadCSV() {
  if (!report.value) return

  const rows = [
    ['Date', report.value.date],
    ['Revenue', report.value.summary.revenue],
    ['Transactions', report.value.summary.transactions],
    [],
    ['Top Products'],
    ['Name', 'Qty Sold', 'Revenue'],
    ...report.value.topProducts.map((p) => [p.name, p.qty, p.revenue]),
    [],
    ['Low Stock Alerts'],
    ['SKU', 'Name', 'Current Stock', 'Min Stock'],
    ...report.value.lowStockItems.map((p) => [p.sku, p.name, p.stockQty, p.minStockQty])
  ]

  const csvContent = rows.map((e) => e.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', `report-${report.value.date}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Daily Report</h1>
          <p class="text-sm text-slate-400">Overview of sales and stock status.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <input 
            v-model="dateParam" 
            type="date" 
            class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
          <button 
            @click="downloadCSV"
            class="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            :disabled="!report"
          >
            Export CSV
          </button>
        </div>
      </header>

      <div v-if="pending" class="text-center text-slate-400 py-10">
        Loading report data...
      </div>

      <template v-else-if="report">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 class="text-sm font-medium text-slate-400">Total Revenue</h3>
            <p class="mt-2 text-2xl font-bold text-emerald-400">Rp {{ report.summary.revenue.toLocaleString('id-ID') }}</p>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 class="text-sm font-medium text-slate-400">Transactions</h3>
            <p class="mt-2 text-2xl font-bold text-white">{{ report.summary.transactions }}</p>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 class="text-sm font-medium text-slate-400">Total Discounts</h3>
            <p class="mt-2 text-2xl font-bold text-rose-400">Rp {{ report.summary.discounts.toLocaleString('id-ID') }}</p>
          </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-6">
          <!-- Top Products -->
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 class="mb-4 text-lg font-semibold text-white">Top 10 Products</h2>
            <div class="space-y-3">
              <div v-for="item in report.topProducts" :key="item.name" class="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div>
                  <p class="font-medium text-slate-200">{{ item.name }}</p>
                  <p class="text-xs text-slate-500">{{ item.qty }} sold</p>
                </div>
                <strong class="text-emerald-300">Rp {{ item.revenue.toLocaleString('id-ID') }}</strong>
              </div>
              <div v-if="!report.topProducts.length" class="text-sm text-slate-500">No sales on this date.</div>
            </div>
          </div>

          <!-- Low Stock Alerts -->
          <div class="rounded-2xl border border-rose-900/30 bg-slate-900 p-5">
            <h2 class="mb-4 text-lg font-semibold text-rose-400">Low Stock Alerts</h2>
            <div class="space-y-3">
              <div v-for="item in report.lowStockItems" :key="item.id" class="flex items-center justify-between rounded-xl bg-rose-950/20 p-3 border border-rose-900/30">
                <div>
                  <p class="font-medium text-slate-200">{{ item.name }}</p>
                  <p class="text-xs text-slate-500">SKU: {{ item.sku }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-rose-400">{{ item.stockQty }} left</p>
                  <p class="text-xs text-slate-500">Min: {{ item.minStockQty }}</p>
                </div>
              </div>
              <div v-if="!report.lowStockItems.length" class="text-sm text-emerald-500">All products have healthy stock levels.</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
