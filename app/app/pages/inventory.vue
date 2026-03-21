<script setup lang="ts">
const { data: productsData } = await useFetch('/api/products?limit=100')
const products = computed(() => productsData.value?.items || [])

const { data: movementsData, refresh: refreshMovements } = await useFetch('/api/inventory/movements')
const movements = computed(() => movementsData.value?.items || [])

const selectedProductId = ref('')
const adjustmentType = ref<'ADD' | 'SUBTRACT' | 'SET'>('ADD')
const adjustmentValue = ref(0)
const reason = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const selectedProductStock = computed(() => {
  if (!selectedProductId.value) return null
  return products.value.find(p => p.id === selectedProductId.value)?.stockQty ?? null
})

const projectedStock = computed(() => {
  if (selectedProductStock.value === null) return null
  if (adjustmentType.value === 'ADD') return selectedProductStock.value + adjustmentValue.value
  if (adjustmentType.value === 'SUBTRACT') return Math.max(0, selectedProductStock.value - adjustmentValue.value)
  if (adjustmentType.value === 'SET') return adjustmentValue.value
  return null
})

async function submitAdjustment() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedProductId.value || !reason.value || adjustmentValue.value < 0) {
    errorMessage.value = 'Please fill all fields correctly.'
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/inventory/adjust', {
      method: 'POST',
      body: {
        productId: selectedProductId.value,
        adjustmentType: adjustmentType.value,
        value: adjustmentValue.value,
        reason: reason.value
      }
    })
    
    successMessage.value = 'Stock adjusted successfully.'
    selectedProductId.value = ''
    adjustmentValue.value = 0
    reason.value = ''
    adjustmentType.value = 'ADD'
    
    // Refresh lists
    await refreshMovements()
    // Ideally we also refresh products data here to get new stock, but handled simply via page reload/refetch
    location.reload()
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || 'Failed to adjust stock'
  } finally {
    isSubmitting.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Stock Adjustment & Audit</h1>
          <p class="text-sm text-slate-400">Manual inventory corrections and movement history.</p>
        </div>
      </header>

      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Adjustment Form -->
        <section class="lg:col-span-1 space-y-4">
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 class="text-lg font-semibold text-white mb-4">New Adjustment</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">Product</label>
                <select v-model="selectedProductId" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40">
                  <option value="" disabled>Select product...</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">
                    {{ p.name }} (Stock: {{ p.stockQty }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">Action</label>
                <select v-model="adjustmentType" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40">
                  <option value="ADD">Add (+)</option>
                  <option value="SUBTRACT">Subtract (-)</option>
                  <option value="SET">Set Exact Value (=)</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">Value / Qty</label>
                <input v-model.number="adjustmentValue" type="number" min="0" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
              </div>

              <div v-if="selectedProductStock !== null" class="rounded-lg bg-slate-950 p-3 border border-slate-800 text-sm">
                <p class="text-slate-400 flex justify-between">Current: <span>{{ selectedProductStock }}</span></p>
                <p class="text-sky-300 font-medium flex justify-between mt-1">Projected: <span>{{ projectedStock }}</span></p>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">Reason (Required)</label>
                <input v-model="reason" type="text" placeholder="e.g. Broken item, stock opname" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
              </div>

              <p v-if="errorMessage" class="text-sm text-rose-400">{{ errorMessage }}</p>
              <p v-if="successMessage" class="text-sm text-emerald-400">{{ successMessage }}</p>

              <button 
                @click="submitAdjustment"
                :disabled="isSubmitting || !selectedProductId || !reason"
                class="w-full rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Saving...' : 'Confirm Adjustment' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Audit Trail / Movements -->
        <section class="lg:col-span-2">
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5 h-full">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-white">Stock Movement Audit Trail</h2>
              <button @click="refreshMovements" class="text-sm text-sky-400 hover:text-sky-300">Refresh</button>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table class="w-full text-left text-sm text-slate-300">
                <thead class="bg-slate-900 text-xs uppercase text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Time</th>
                    <th class="px-4 py-3">Product</th>
                    <th class="px-4 py-3">Type</th>
                    <th class="px-4 py-3">Delta</th>
                    <th class="px-4 py-3">Reason / Ref</th>
                    <th class="px-4 py-3">User</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  <tr v-for="m in movements" :key="m.id" class="hover:bg-slate-900/50 transition">
                    <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(m.createdAt) }}</td>
                    <td class="px-4 py-3 font-medium text-slate-200">{{ m.product?.name || 'Unknown' }}</td>
                    <td class="px-4 py-3">
                      <span :class="{
                        'text-emerald-400': m.movementType === 'RESTOCK',
                        'text-sky-400': m.movementType === 'SALE',
                        'text-rose-400': m.movementType === 'ADJUSTMENT'
                      }">{{ m.movementType }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono" :class="m.qtyDelta > 0 ? 'text-emerald-400' : 'text-rose-400'">
                      {{ m.qtyDelta > 0 ? '+' : '' }}{{ m.qtyDelta }}
                    </td>
                    <td class="px-4 py-3">
                      {{ m.reason || (m.transaction ? `Trx: ${m.transaction.invoiceNumber}` : '-') }}
                    </td>
                    <td class="px-4 py-3">{{ m.actorUser?.username || 'System' }}</td>
                  </tr>
                  <tr v-if="movements.length === 0">
                    <td colspan="6" class="px-4 py-8 text-center text-slate-500">No stock movements found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
