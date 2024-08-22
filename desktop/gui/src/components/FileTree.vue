<template>
  <TreeRoot
    v-slot="{ flattenItems }"
    class="list-none select-none rounded-lg p-2 text-sm font-medium"
    :items="treeItems"
    :get-key="(item) => item._id"
    v-model="selectedTreeItem"
  >
    <TreeItem
      v-for="item in flattenItems"
      v-slot="{ isExpanded }"
      :key="item._id"
      :style="{ 'padding-left': `${item.level - 0.5}rem` }"
      v-bind="item.bind"
      class="flex items-center py-1 px-2 my-0.5 rounded outline-none focus:ring-grass8 focus:ring-2 data-[selected]:bg-grass4"
    >
      <template v-if="item.hasChildren">
        <Icon
          v-if="!isExpanded"
          icon="lucide:folder"
          class="h-4 w-4"
        />
        <Icon
          v-else
          icon="lucide:folder-open"
          class="h-4 w-4"
        />
      </template>
      <Icon
        v-else
        :icon="item.value.icon || 'lucide:file'"
        class="h-4 w-4"
      />
      <div class="pl-2">
        {{ item.value.title }}
      </div>
    </TreeItem>
  </TreeRoot>
</template>
<script lang="ts" setup generic="T extends { _id: string, name: string, size: number }">
import { ref, computed } from "vue";
import { TreeItem, TreeRoot } from 'radix-vue'
import { Icon } from '@iconify/vue'

type TreeEntry = {
  _id: string;
  title: string;
  icon: string;
  type: 'folder' | 'media';
  children?: TreeEntry[];
};

type FolderInfo = {
  folderToFileMap: Map<string, T[]>;
  folderParentMap: Map<string, string[]>;
};

const props = defineProps<{
  files: T[]
}>();

const selectedTreeItem = ref<TreeEntry>();

const folderInfo = computed<FolderInfo>(() => {
  const paths = new Set<string>();
  const folderToFileMap = new Map<string, T[]>();
  for (const file of props.files) {
    let parentPath = getParentPath(file.name);
    pushToMapArrayValue(folderToFileMap, parentPath, file);

    while (parentPath) {
      paths.add(parentPath);
      parentPath = getParentPath(parentPath);
    }
  }

  const parentMap = new Map<string, string[]>();

  // paths => foo, foo/bar, foo/bar/bax, klo, klo/k,
  // find parents
  for (const path of paths) {
    const parent = getParentPath(path);
    pushToMapArrayValue(parentMap, parent, path);
  }

  // parentMap => "": ["foo", "klo"], "foo" => ["foo/bar", "foo/baz"], "klo" => ""

  return {
    folderToFileMap,
    folderParentMap: parentMap
  };
});

const treeItems = computed<TreeEntry[]>(() => {
  console.log('folder info', folderInfo.value);
  const items = getFileTree(folderInfo.value, "");
  console.log('computed tree items', items);
  return items;
});

function getFileTree(info: FolderInfo, startPath: string): TreeEntry[] {
  const rootFolders = folderInfo.value.folderParentMap.get(startPath) || [];

  

  const result: TreeEntry[] = [];

  for (const folder of rootFolders) {
    const item: TreeEntry = {
      _id: folder,
      title: getBaseName(folder),
      icon: 'lucile:folder',
      type: 'folder',
      children: [] as TreeEntry[]
    };

    const subFolders = getFileTree(info, folder);
    item.children = subFolders;
    
    result.push(item);
  }

  const files = folderInfo.value.folderToFileMap.get(startPath) || [];
  for (const file of files) {
    result.push({
      _id: file._id,
      title: getBaseName(file.name),
      icon: 'lucide:file',
      type: 'media',
    });
  }

  return result;
}


function getBaseName(path: string) {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return path;
  }

  return path.substring(lastSlashIndex + 1);
}

function pushToMapArrayValue<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) || [];
  values.push(value);
  map.set(key, values);
}

function getParentPath(path: string) {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return "";
  }

  const parentPath = path.substring(0, lastSlashIndex);
  return parentPath;
}
</script>