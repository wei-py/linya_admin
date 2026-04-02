<template>
  <VApp>
    <div class="min-h-screen bg-slate-200 w-full">
      <VNavigationDrawer color="transparent" floating border="0" width="280" permanent>
        <div class="m-4 panel-card p-5">
          <div class="text-xs uppercase tracking-[0.25em] text-slate-400">
            Linya Admin
          </div>
        </div>

        <div class="mx-4 mt-4 space-y-3">
          <RouterLink to="/preset" class="block">
            <div class="flex items-center justify-between rounded-5 px-4 py-3 text-left transition" :class="$route.path === '/preset'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'panel-card text-slate-700 hover:bg-white'
              ">
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-tune-variant" />
                <span class="font-medium">预设</span>
              </span>
            </div>
          </RouterLink>

          <RouterLink to="/template" class="block">
            <div class="flex items-center justify-between rounded-5 px-4 py-3 text-left transition" :class="$route.path === '/template'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'panel-card text-slate-700 hover:bg-white'
              ">
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-table-search" />
                <span class="font-medium">模板</span>
              </span>
            </div>
          </RouterLink>

          <RouterLink to="/create" class="block">
            <div class="flex items-center justify-between rounded-5 px-4 py-3 text-left transition" :class="$route.path === '/create'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'panel-card text-slate-700 hover:bg-white'
              ">
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-pencil-box-outline" />
                <span class="font-medium">创建</span>
              </span>
            </div>
          </RouterLink>

          <RouterLink to="/list" class="block">
            <div class="flex items-center justify-between rounded-5 px-4 py-3 text-left transition" :class="$route.path === '/list'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'panel-card text-slate-700 hover:bg-white'
              ">
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-file-document-multiple-outline" />
                <span class="font-medium">列表</span>
              </span>
            </div>
          </RouterLink>
        </div>
      </VNavigationDrawer>

      <VAppBar color="transparent" flat height="80">
        <VAppBarTitle class="font-weight-bold text-slate-900">
          Linya Admin
        </VAppBarTitle>
      </VAppBar>

      <VMain class="h-full w-full">
        <div class="mx-auto h-full w-full pb-10 pt-2 px-4">
          <RouterView />
        </div>
      </VMain>
    </div>
  </VApp>
</template>
