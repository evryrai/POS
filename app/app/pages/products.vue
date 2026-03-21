<script setup lang="ts">
import { ref, computed } from 'vue'

type ProductItem = {
  id: string
  sku: string
  barcode: string | null
  name: string
  category: string | null
  unit: string
  costPrice: number
  sellPrice: number
  stockQty: number
  minStockQty: number
  isActive: boolean
}

const { data, pending, refresh } = await useFetch('/api/products', {
  query: { limit: 100 } // Get a reasonable list to manage
})

const items = computed<ProductItem[]>(() => data.value?.items ?? [])

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formMode = ref<'create' | 'edit'>('create')
const editId = ref('')

const form = ref({
  sku: '',
  barcode: '',
  name: '',
  category: '',
  unit: 'pcs',
  costPrice: 0,
  sellPrice: 0,
  stockQty: 0,
  minStockQty: 0
})

function openCreateModal() {
  formMode.value = 'create'
  editId.value = ''
  form.value = { sku: '', barcode: '', name: '', category: '', unit: 'pcs', costPrice: 0, sellPrice: 0, stockQty: 0, minStockQty: 0 }
  errorMessage.value = ''
  successMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(p: ProductItem) {
  formMode.value = 'edit'
  editId.value = p.id
  form.value = {
    sku: p.sku,
    barcode: p.barcode || '',
    name: p.name,
    category: p.category || '',
    unit: p.unit,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
    stockQty: p.stockQty,
    minStockQty: p.minStockQty
  }
  errorMessage.value = ''
  successMessage.value = ''
  isModalOpen.value = true
}

async function submitForm() {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const payload = { ...form.value }
    // Clean up empty strings to null for API if needed
    if (!payload.barcode) delete (payload as any).barcode
    if (!payload.category) delete (payload as any).category

    if (formMode.value === 'create') {
      await $fetch('/api/products', { method: 'POST', body: payload })
      successMessage.value = 'Product created successfully'
    } else {
      // Because we edit stock via adjustments usually, we strip stock fields here to prevent manual override, 
      // but API allows it. We'll send it for initial simplicity.
      await $fetch(`/api/products/${editId.value}`, { method: 'PATCH', body: payload })
      successMessage.value = 'Product updated successfully'
    }

    await refresh()
    setTimeout(() => {
      isModalOpen.value = false
    }, 1000)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to save product'
  } finally {
    isSubmitting.value = false
  }
}

async function deactivateProduct(id: string) {
  if (!confirm('Are you sure you want to delete (deactivate) this product?')) return
  try {
    await $fetch(`/api/products/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to delete')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <!-- Header -->
      <header class="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Master Data</p>
          <h1 class="mt-1 text-2xl font-bold text-white">Product Management</h1>
          <p class="mt-1 text-sm text-slate-400">Add, edit, or delete store products.</p>
        </div>
        <div class="flex items-center gap-3">
          <a href="/" class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700">Back to POS</a>
          <button @click="openCreateModal" class="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-400">
            + New Product
          </button>
        </div>
      </header>

      <!-- List -->
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div v-if="pending" class="text-center py-10 text-slate-400">Loading products...</div>
        <div v-else-if="items.length === 0" class="text-center py-10 text-slate-400">No products found. Click "+ New Product" to start.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900 text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th class="px-4 py-3">SKU</th>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Category</th>
                <th class="px-4 py-3 text-right">Cost Price</th>
                <th class="px-4 py-3 text-right">Sell Price</th>
                <th class="px-4 py-3 text-center">Stock</th>
                <th class="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="p in items" :key="p.id" class="hover:bg-slate-900/50 transition">
                <td class="px-4 py-3 font-mono text-xs">{{ p.sku }}</td>
                <td class="px-4 py-3 font-medium text-slate-200">{{ p.name }}</td>
                <td class="px-4 py-3">{{ p.category || '-' }}</td>
                <td class="px-4 py-3 text-right">Rp {{ Number(p.costPrice).toLocaleString('id-ID') }}</td>
                <td class="px-4 py-3 text-right text-emerald-400 font-medium">Rp {{ Number(p.sellPrice).toLocaleString('id-ID') }}</td>
                <td class="px-4 py-3 text-center">
                  <span :class="p.stockQty <= p.minStockQty ? 'text-rose-400 font-bold' : 'text-slate-300'">
                    {{ p.stockQty }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center space-x-3">
                  <button @click="openEditModal(p)" class="text-sky-400 hover:text-sky-300 transition">Edit</button>
                  <button @click="deactivateProduct(p.id)" class="text-rose-400 hover:text-rose-300 transition">Del</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 p-5">
          <h2 class="text-lg font-semibold text-white">{{ formMode === 'create' ? 'Create New Product' : 'Edit Product' }}</h2>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-200">&times;</button>
        </div>

        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">SKU (Required)</label>
              <input v-model="form.sku" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">Barcode (Optional)</label>
              <input v-model="form.barcode" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">Name (Required)</label>
              <input v-model="form.name" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">Category (Optional)</label>
              <input v-model="form.category" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">Cost Price (Rp)</label>
              <input v-model.number="form.costPrice" type="number" min="0" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">Sell Price (Rp) (Required)</label>
              <input v-model.number="form.sellPrice" type="number" min="0" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div v-if="formMode === 'create'">
              <label class="block text-sm font-medium text-slate-400 mb-1">Initial Stock</label>
              <input v-model.number="form.stockQty" type="number" min="0" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-1">Min Stock Alert</label>
              <input v-model.number="form.minStockQty" type="number" min="0" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
            </div>
          </div>
        </div>

        <div class="border-t border-slate-800 p-5 flex flex-col gap-3">
          <p v-if="errorMessage" class="text-sm text-rose-400">{{ errorMessage }}</p>
          <p v-if="successMessage" class="text-sm text-emerald-400">{{ successMessage }}</p>

          <div class="flex justify-end gap-3">
            <button @click="isModalOpen = false" class="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200">Cancel</button>
            <button @click="submitForm" :disabled="isSubmitting" class="rounded-xl bg-sky-500 px-6 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Saving...' : 'Save Product' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
