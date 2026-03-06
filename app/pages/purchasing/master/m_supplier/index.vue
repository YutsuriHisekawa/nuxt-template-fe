<script setup lang="js">
import { toast } from "vue-sonner"
import { Trash2, Eye, Edit, Copy } from "lucide-vue-next"

const api = useApi()
const router = useRouter()
const route = useRoute()

const rowData = ref([])
const loading = ref(false)
const errorMessage = ref("")
const deleteDialogOpen = ref(false)
const deleteTarget = ref(null)
const activeFilter = ref("active")
const paginationData = ref(null)
const dataTable = ref(null)
const searchInput = ref("")

// Mobile detection
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value < 768)

onMounted(() => {
	const onResize = () => { windowWidth.value = window.innerWidth }
	window.addEventListener('resize', onResize)
	onUnmounted(() => window.removeEventListener('resize', onResize))
})

// Helper: check is_active value
const checkActive = (val) => val === true || val === 1 || val === "1" || val === "true"

const landing = reactive({
	api: {
		url: "/api/dynamic/m_supplier",
		async fetch({ page = 1, pageSize = 25, search = '', searchfield = '' } = {}) {
			loading.value = true
			errorMessage.value = ""
			try {
				const params = new URLSearchParams({
					page: String(page),
					paginate: String(pageSize),
					join: "true",
				})
				params.set("order_by", "createdAt")
				params.set("order_type", "DESC")
				params.set("filter_column_is_active", activeFilter.value === "active" ? "true" : "false")
				params.set("filter_operator_is_active", "=")
				if (search) {
					params.set("search", search)
					params.set("searchfield", searchfield)
				}
				const response = await api.get(`${landing.api.url}?${params.toString()}`)
				if (response?.status === "success" && Array.isArray(response.data)) {
					rowData.value = response.data
					paginationData.value = response.pagination || null
				} else {
					errorMessage.value = response?.message || "Gagal memuat data"
				}
			} catch (error) {
				errorMessage.value = error?.message || "Gagal memuat data"
			} finally {
				loading.value = false
			}
		},
		async delete() {
			const target = deleteTarget.value
			if (!target?.id) return
			try {
				await api.del(`${landing.api.url}/${target.id}`)
				toast.success("Data berhasil dihapus")
				deleteDialogOpen.value = false
				deleteTarget.value = null
				if (isMobile.value) {
					landing.api.fetch({ search: searchInput.value })
				} else {
					dataTable.value?.refresh()
				}
			} catch (error) {
				toast.error("Gagal menghapus data", {
					description: error?.message || "Terjadi kesalahan",
				})
			}
		},
	},
	actions: [
		{
			icon: "trash",
			title: "Hapus",
			variant: "destructive",
			show: (row) => row.is_active !== false,
			click(row) {
				if (!row?.id) return
				deleteTarget.value = row
				deleteDialogOpen.value = true
			},
		},
		{
			icon: "eye",
			title: "Lihat",
			variant: "secondary",
			click(row) {
				router.push(`${route.path}/form/${row.id}`)
			},
		},
		{
			icon: "edit",
			title: "Edit",
			variant: "primary",
			click(row) {
				router.push(`${route.path}/form/${row.id}?action=Edit`)
			},
		},
		{
			icon: "copy",
			title: "Copy",
			variant: "outline",
			click(row) {
				router.push(`${route.path}/form/${row.id}?action=Copy`)
			},
		},
	],
	columns: [
		{ headerName: "Kode Vendor", field: "kode_supplier", minWidth: 140 },
		{ headerName: "Nama Vendor", field: "nama_supp", minWidth: 140 },
		{ headerName: "Negara", field: "negara_supp_id", minWidth: 140 },
		{ headerName: "Kota", field: "kota_supp_id", minWidth: 140 },
	],
})

const onFilterChange = (value) => {
	if (activeFilter.value === value) return
	activeFilter.value = value
	if (isMobile.value) {
		landing.api.fetch({ search: searchInput.value })
	} else {
		dataTable.value?.refresh()
	}
}

const onMobileSearch = () => {
	landing.api.fetch({ search: searchInput.value.trim() })
}

// Icon mapping for mobile cards
const actionIcons = { trash: Trash2, eye: Eye, edit: Edit, copy: Copy }
</script>

<template>
	<div class="space-y-4 pt-5">
		<!-- Page Header -->
		<div class="px-1">
			<h1 class="text-xl sm:text-2xl font-bold tracking-tight">Master Supplier</h1>
			<p class="text-xs sm:text-sm text-muted-foreground">Kelola master supplier aplikasi</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-2">
			<!-- Filter Status -->
			<div class="flex flex-wrap items-center gap-2 px-2 pb-2">
				<span class="text-xs sm:text-sm font-medium text-muted-foreground">Filter Status :</span>
				<button
					type="button"
					class="inline-flex h-7 sm:h-8 items-center rounded-md border px-2.5 sm:px-3 text-xs sm:text-sm font-medium"
					:class="activeFilter === 'active'
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-background text-foreground hover:bg-accent'"
					@click="onFilterChange('active')"
				>Aktif</button>
				<button
					type="button"
					class="inline-flex h-7 sm:h-8 items-center rounded-md border px-2.5 sm:px-3 text-xs sm:text-sm font-medium"
					:class="activeFilter === 'inactive'
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-background text-foreground hover:bg-accent'"
					@click="onFilterChange('inactive')"
				>Nonaktif</button>
			</div>

			<!-- ===== DESKTOP: DataTable ===== -->
			<div v-if="!isMobile">
				<DataTable
					ref="dataTable"
					:columnDefs="landing.columns"
					:rowData="rowData"
					:loading="loading"
					:pagination="paginationData"
					:actions="landing.actions"
					actionsPlacement="toolbar"
					:showSearch="true"
					:showRowNumber="true"
					searchPlaceholder="Search master supplier..."
					:showCreateButton="true"
					createButtonText="Create New"
					@request="landing.api.fetch"
					@create="router.push(route.path + '/form')"
				/>
			</div>

			<!-- ===== MOBILE: Card Layout ===== -->
			<div v-else class="space-y-3 px-1">
				<!-- Search & Create -->
				<div class="flex items-center gap-2">
					<form class="flex flex-1 items-center gap-2" @submit.prevent="onMobileSearch">
						<input
							v-model="searchInput"
							type="text"
							placeholder="Search master supplier..."
							class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
						/>
					</form>
					<button
						type="button"
						class="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
						@click="router.push(route.path + '/form')"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path fill="currentColor" d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1z"/>
						</svg>
						<span class="hidden xs:inline">Baru</span>
					</button>
				</div>

				<!-- Loading -->
				<div v-if="loading" class="flex items-center justify-center py-12">
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>

				<!-- Empty -->
				<div v-else-if="rowData.length === 0" class="py-12 text-center text-sm text-muted-foreground">
					Tidak ada data
				</div>

				<!-- Cards -->
				<div v-else class="space-y-2">
					<div
						v-for="(row, idx) in rowData"
						:key="row.id || idx"
						class="rounded-lg border border-border bg-background p-3 space-y-2"
					>
						<!-- Header -->
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold truncate">{{ row.kode_supplier || '-' }}</p>
								<p class="text-xs text-muted-foreground truncate">{{ row.nama_supp || '-' }}</p>
							</div>
							<span
								class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
								:class="checkActive(row.is_active) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
							>
								{{ checkActive(row.is_active) ? 'Aktif' : 'Nonaktif' }}
							</span>
						</div>

						<!-- Info rows -->
						<div class="grid grid-cols-1 gap-y-0.5 text-xs">
							<div v-if="row.negara_supp"><span class="text-muted-foreground">Negara:</span> <span class="font-medium">{{ row.negara_supp }}</span></div>
							<div v-if="row.kota_supp"><span class="text-muted-foreground">Kota:</span> <span class="font-medium">{{ row.kota_supp }}</span></div>
						</div>

						<!-- Action buttons -->
						<div class="flex items-center gap-1.5 pt-1 border-t border-border">
							<template v-for="(action, ai) in landing.actions" :key="ai">
								<button
									v-if="!action.show || action.show(row)"
									type="button"
									class="inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors"
									:class="{
										'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90': action.variant === 'destructive',
										'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80': action.variant === 'secondary',
										'border-transparent bg-primary text-primary-foreground hover:bg-primary/90': action.variant === 'primary',
										'border-border bg-background text-foreground hover:bg-accent': action.variant === 'outline',
									}"
									:title="action.title"
									@click="action.click(row)"
								>
									<component :is="actionIcons[action.icon]" class="h-3.5 w-3.5" />
								</button>
							</template>
						</div>
					</div>
				</div>

				<!-- Mobile Pagination -->
				<div v-if="paginationData && rowData.length > 0" class="flex items-center justify-between pt-2 text-xs text-muted-foreground">
					<span>{{ paginationData.total ?? 0 }} data</span>
					<span>Hal {{ paginationData.page ?? 1 }} / {{ paginationData.totalPages ?? 1 }}</span>
				</div>
			</div>

			<!-- Delete Dialog -->
			<AlertDialog v-model:open="deleteDialogOpen">
				<AlertDialogContent class="max-w-[90vw] sm:max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus data?</AlertDialogTitle>
						<AlertDialogDescription>
							Data "{{ deleteTarget?.kode_supplier || deleteTarget?.id || '-' }}" akan dihapus permanen.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Batal</AlertDialogCancel>
						<AlertDialogAction @click="landing.api.delete()">Hapus</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<div v-if="errorMessage" class="px-3 py-2 text-sm text-destructive">
				{{ errorMessage }}
			</div>
		</div>
	</div>
</template>
