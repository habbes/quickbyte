<template>
  <div v-if="file" class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <div class="h-12 border-b border-b-[#120c11] flex flex-row items-center px-5" :style="headerClasses">top</div>
    <div class="flex-1 flex flex-row">
      <div class="w-96 border-r border-r-[#120c11] text-[#d1bfcd] text-xs flex flex-col justify-end">
        <div class="overflow-y-scroll flex flex-col justify-end" :style="commentsListClasses">
          <div v-for="comment in comments" class="px-5 py-2 border-b border-b-[#120c11] last:border-b-0">
            <div class="flex flex-row items-center justify-between mb-2">
              <div class="flex flex-row items-center gap-2">
                <span class="text-sm text-white">{{ comment.commenter }}</span>
                <span>{{ comment._createdAt.toLocaleDateString() }}</span>
              </div>
              <span
                @click="seekToComment(comment)"
                class="font-semibold text-blue-300 hover:cursor-pointer"
              >
                {{ formatTimestampDuration(comment.timestamp) }}
              </span>
            </div>
            <div class="text-xs">
              {{ comment.message }}
            </div>
          </div>
        </div>
        <div class="px-5 py-5 border-t border-t-[#120c11] flex flex-col gap-2" :style="commentInputClasses">
          <div class="flex-1">
            <textarea
              class="bg-[#604a59] rounded-md w-full h-full p-2 resize-none"
              placeholder="Type your comment here"
              v-model="commentInputText"
            ></textarea>
          </div>
          <div>
            <button class="btn btn-primary btn-xs" @click="sendComment()">Send</button>
          </div>
        </div>
      </div>
      <div class="flex-1 p-5 flex items-stretch justify-center bg-[#24141f]">
          <div class="h-[90%]">
            <video
              ref="videoPlayer"
              class="h-full"
              :src="file.downloadUrl"
              controls
              @seeked="handleSeek()"
            ></video>
          </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { apiClient, getDeviceData, store } from "@/app-utils";
import { formatTimestampDuration, type DownloadRequestResult } from "@/core";

const videoPlayer = ref<HTMLVideoElement>();
const route = useRoute();
route.params.downloadId;
const error = ref<Error|undefined>();
const download = ref<DownloadRequestResult|undefined>();
const loading = ref(true);
const zipFileName = ref<string>();
const deviceData = store.deviceData;
// keeps track of files that have been individually downloaded
const files = computed(() => download.value?.files || []);
const file = computed(() => files.value.length ? files.value[0] : undefined);
const currentTimeStamp = ref<number>();
const commentInputText = ref<string>();

const headerSize = 48;
const commentInputHeight = 200;

const headerClasses = {
  height: `${headerSize}px`
};
const commentInputClasses = {
  height: `${commentInputHeight}px`
};

const commentsListClasses = {
  height: `calc(100vh - ${headerSize + commentInputHeight}px)`
};


interface Comment {
  commenter: string;
  _createdAt: Date;
  message: string;
  hasAnnotations: boolean;
  timestamp: number;
}

const comments = ref<Comment[]>([
  {
    commenter: 'Alice Johnson',
    _createdAt: new Date('2023-01-01T08:00:00'),
    message: 'This is the first comment.',
    hasAnnotations: true,
    timestamp: 30000, // Comment made at 30 seconds into the video
  },
  {
    commenter: 'Bob Smith',
    _createdAt: new Date('2023-02-05T14:30:00'),
    message: 'Great post! Keep up the good work.',
    hasAnnotations: false,
    timestamp: 120000, // Comment made at 2 minutes into the video
  },
  {
    commenter: 'Charlie Davis',
    _createdAt: new Date('2023-03-10T10:45:00'),
    message: 'I have a question about the topic discussed.',
    hasAnnotations: true,
    timestamp: 180000, // Comment made at 3 minutes into the video
  },
  {
    commenter: 'David Wilson',
    _createdAt: new Date('2023-04-15T18:20:00'),
    message: 'Interesting perspective. Thanks for sharing.',
    hasAnnotations: false,
    timestamp: 240000, // Comment made at 4 minutes into the video
  },
  {
    commenter: 'Eva Brown',
    _createdAt: new Date('2023-05-20T12:15:00'),
    message: 'I disagree with some points mentioned.',
    hasAnnotations: true,
    timestamp: 300000, // Comment made at 5 minutes into the video
  },
  {
    commenter: 'Frank Miller',
    _createdAt: new Date('2023-06-25T16:55:00'),
    message: 'Looking forward to more content from you!',
    hasAnnotations: false,
    timestamp: 360000, // Comment made at 6 minutes into the video
  }
]);

onMounted(async () => {
  if (!route.params.downloadId || typeof route.params.downloadId !== 'string') {
    error.value = new Error("Invalid download link");
    return;
  }

  await getDeviceData();

  try {
    download.value = await apiClient.getDownload(route.params.downloadId, deviceData.value || {});
    download.value.files
    zipFileName.value = `${download.value.name}.zip`;
  }
  catch (e: any) {
    error.value = e;
  }
  finally {
    loading.value = false;
  }
});

function seekToComment(comment: Comment) {
  if (!videoPlayer.value) return;
  videoPlayer.value.currentTime = comment.timestamp / 1000;
}

function handleSeek() {
  console.log('on seeked');
  if (!videoPlayer.value) return;
  currentTimeStamp.value = videoPlayer.value.currentTime;
  console.log('currentTimeStamp', currentTimeStamp.value, videoPlayer.value.currentTime)
}

function sendComment() {
  if (!commentInputText.value) return;

  comments.value.push({
    commenter: 'Habbes',
    message: commentInputText.value,
    hasAnnotations: false,
    timestamp: (currentTimeStamp.value || 0) * 1000,
    _createdAt: new Date()
  });

  commentInputText.value = '';
}
</script>