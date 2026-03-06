<script setup lang="ts">
import type { Component } from "vue"
import { ChevronRight } from "lucide-vue-next"
import { ref, watch, computed } from "vue"

interface MenuItem {
  title: string
  url: string
  icon?: Component | string
  isActive?: boolean
  items?: MenuItem[]
}

const props = defineProps<{
  items: MenuItem[]
}>()

const route = useRoute()

// Track which parent menu is currently open (only one at a time)
const openParentMenu = ref<string | null>(null)

// Watch for route changes to update open menu
watch(() => route.path, () => {
  const activeItem = props.items.find(item => item.isActive && item.items)
  if (activeItem) {
    openParentMenu.value = activeItem.title
  }
}, { immediate: true })

// Toggle parent menu - close others when opening new one
const toggleParentMenu = (title: string) => {
  if (openParentMenu.value === title) {
    openParentMenu.value = null
  } else {
    openParentMenu.value = title
  }
}

// Check if a parent menu is open
const isParentOpen = (title: string) => {
  return openParentMenu.value === title
}
</script>

<template>
  <SidebarGroup v-if="items && items.length > 0">
    <SidebarGroupLabel>Menu</SidebarGroupLabel>
    <SidebarMenu>
      <template v-for="item in items" :key="item.title">
        <!-- Menu item without sub-items -->
        <SidebarMenuItem v-if="!item.items || item.items.length === 0">
          <SidebarMenuButton :tooltip="item.title" :is-active="item.isActive" as-child>
            <NuxtLink :to="item.url" class="flex items-center gap-2">
              <component :is="item.icon" v-if="item.icon" class="h-4 w-4 shrink-0" />
              <span>{{ item.title }}</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <!-- Menu item with sub-items (collapsible) -->
        <Collapsible
          v-else
          as-child
          :open="isParentOpen(item.title)"
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton 
                :tooltip="item.title" 
                :is-active="item.isActive"
                @click="toggleParentMenu(item.title)"
                :class="[
                  item.isActive && 'font-semibold'
                ]"
              >
                <component :is="item.icon" v-if="item.icon" class="shrink-0 h-4 w-4" />
                <span>{{ item.title }}</span>
                <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <template v-for="subItem in item.items" :key="subItem.title">
                  <!-- Sub-item without nested items -->
                  <SidebarMenuSubItem v-if="!subItem.items || subItem.items.length === 0">
                    <SidebarMenuSubButton as-child :is-active="subItem.isActive">
                      <NuxtLink :to="subItem.url" class="flex items-center gap-2">
                        <component :is="subItem.icon" v-if="subItem.icon" class="h-4 w-4 shrink-0" />
                        <span>{{ subItem.title }}</span>
                      </NuxtLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  <!-- Sub-item with nested items (3rd level) -->
                  <Collapsible
                    v-else
                    as-child
                    :default-open="subItem.isActive"
                    class="group/collapsible-sub"
                  >
                    <SidebarMenuSubItem>
                      <CollapsibleTrigger as-child>
                        <SidebarMenuSubButton class="flex items-center gap-2">
                          <component :is="subItem.icon" v-if="subItem.icon" class="h-4 w-4 shrink-0" />
                          <span>{{ subItem.title }}</span>
                          <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible-sub:rotate-90" />
                        </SidebarMenuSubButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem v-for="nestedItem in subItem.items" :key="nestedItem.title">
                            <SidebarMenuSubButton as-child :is-active="nestedItem.isActive">
                              <NuxtLink :to="nestedItem.url" class="flex items-center gap-2">
                                <component :is="nestedItem.icon" v-if="nestedItem.icon" class="h-4 w-4 shrink-0" />
                                <span>{{ nestedItem.title }}</span>
                              </NuxtLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuSubItem>
                  </Collapsible>
                </template>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </template>
    </SidebarMenu>
  </SidebarGroup>
</template>
