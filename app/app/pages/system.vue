<script setup lang="ts">
import { ref } from 'vue'

const isRestoring = ref(false)
const restoreMessage = ref('')
const restoreError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

async function triggerRestore() {
  if (!fileInput.value?.files?.length) {
    restoreError.value = 'Please select a backup file first.'
    return
  }

  const file = fileInput.value.files[0]
  if (!file.name.endsWith('.db')) {
    restoreError.value = 'File must be a .db SQLite backup.'
    return
  }

  if (!confirm('WARNING: This will completely replace your current database and CANNOT be undone. Are you sure?')) {
    return
  }

  isRestoring.value = true
  restoreMessage.value = ''
  restoreError.value = ''

  const formData = new FormData()
  formData.append('database', file)

  try {
    const res = await $fetch<{ ok: boolean; message: string }>('/api/system/restore', {
      method: 'POST',
      body: formData
    })
    
    restoreMessage.value = 'Restore successful! The application will reload in 3 seconds.'
    setTimeout(() => {
      window.location.href = '/' // Reload app
    }, 3000)
  } catch (error: any) {
    restoreError.value = error?.data?.statusMessage || error?.message || 'Failed to restore database.'
  } finally {
    isRestoring.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
    <div class="mx-auto max-w-3xl space-y-6">
      <header class="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
        <h1 class="text-2xl font-bold text-white">System & Backup</h1>
        <p class="text-sm text-slate-400">Manage your local database, create backups, and restore data.</p>
      </header>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- BACKUP SECTION -->
        <section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-white">Download Backup</h2>
            <p class="text-sm text-slate-400 mt-1">Download a full copy of your current local database. Keep this file safe.</p>
          </div>
          
          <a 
            href="/api/system/backup" 
            target="_blank"
            class="inline-flex w-full justify-center rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Download .db File
          </a>
        </section>

        <!-- RESTORE SECTION -->
        <section class="rounded-2xl border border-rose-900/30 bg-rose-950/10 p-6">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-rose-400">Restore Database</h2>
            <p class="text-sm text-slate-400 mt-1">Upload a previous <code class="text-rose-300 bg-rose-900/40 px-1 rounded">.db</code> file. This will overwrite all current data.</p>
          </div>

          <div class="space-y-4">
            <input 
              ref="fileInput" 
              type="file" 
              accept=".db"
              class="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />

            <p v-if="restoreError" class="rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">{{ restoreError }}</p>
            <p v-if="restoreMessage" class="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-400">{{ restoreMessage }}</p>

            <button 
              @click="triggerRestore"
              :disabled="isRestoring"
              class="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isRestoring ? 'Restoring...' : 'Upload & Restore' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
