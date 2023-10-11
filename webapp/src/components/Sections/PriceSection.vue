<script setup lang="ts">
import { computed, ref } from 'vue'

const isToggled = ref(false)

function handleToggleSubscription(value: boolean) {
  isToggled.value = value
}

const subscriptionPrice = computed(() => {
  return isToggled.value === true ? 'Sh 750' : 'Sh 900'
})

const pricingPlans = [
  {
    id: 1,
    plan: 'Professional',
    planDescription: 'Everything a small team needs.',
    currency: 'KSH / month',
    recommended: false,
    features: [
      {
        id: 1,
        feature: 'Send up to 200GB per transfer',
      },

      {
        id: 2,
        feature: 'Recover failed transfers within 7 days',
      },

      {
        id: 3,
        feature: '500GB total storage size',
      },

      {
        id: 4,
        feature: '30-day transfer expiry',
      },

      {
        id: 5,
        feature: 'More features coming soon',
      },
    ],
  },
]
</script>

<template>
  <section id="#pricing" class="max-w-[85rem] pt-20 px-4 sm:px-6 lg:px-8 mx-auto">
    <div class="mb-6 space-y-6">
      <div class="grid space-y-4 text-center place-items-center">
        <p class="max-w-md text-3xl font-bold leading-10 text-gray-200 lg:text-4xl ">
          A Plan that supports your <span class="text-[#5B53FF]" data-aos="fade-up">growth</span>
        </p>
        <span class="max-w-md text-gray-200">Our pricing plan provides the necessary features and resources to
          support
          your continued expansion and success.</span>
      </div>
      <SubscriptionToggle @toggle="handleToggleSubscription" />
    </div>

    <div class="relative grid place-items-center xl:w-10/12 xl:mx-auto">
      <div class="grid grid-cols-1 gap-6 lg:gap-8">
        <div v-for="plan in pricingPlans" :key="plan.id">
          <div
            class="relative z-10 p-4 bg-black border border-[#131319] rounded-xl md:p-10 dark:bg-slate-900 dark:border-gray-700"
          >
            <h3 class="text-xl font-bold text-center text-white ">
              {{ plan.plan }}
            </h3>
            <div class="text-sm text-center text-gray-200">
              {{ plan.planDescription }}
            </div>
            <span
              v-if="plan.recommended"
              class="absolute top-0 right-0 rounded-tr-xl rounded-bl-xl text-xs font-medium bg-[#5B53FF] text-white py-1.5 px-3 dark:bg-gray-900"
            >Recommended</span>

            <div class="flex items-center mt-5 space-x-2">
              <div class="w-full text-center">
                <span class="text-4xl font-bold text-white md:text-4xl ">{{ subscriptionPrice }}</span>
                <span class="ml-3 text-gray-200">{{ plan.currency }}</span>
              </div>
            </div>

            <div class="grid py-4 mt-5 gap-y-2 first:pt-0 last:pb-0 sm:gap-x-6 sm:gap-y-0">
              <ul role="list" class="space-y-2 text-sm sm:text-base">
                <li v-for="feature in plan.features" :key="feature.id" class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-[#5B53FF]" width="18" height="18"
                    viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="18" height="18" rx="9" fill="currentColor" fill-opacity="0.1" />
                    <path
                      d="M12.0603 5.78792C12.2511 5.56349 12.5876 5.5362 12.8121 5.72697C13.0365 5.91774 13.0638 6.25432 12.873 6.47875L8.3397 11.8121C8.14594 12.04 7.80261 12.064 7.57901 11.8653L5.17901 9.73195C4.95886 9.53626 4.93903 9.19915 5.13472 8.979C5.33041 8.75885 5.66751 8.73902 5.88766 8.93471L7.88011 10.7058L12.0603 5.78792Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span class="text-gray-200">
                    {{ feature.feature }}
                  </span>
                </li>
              </ul>
            </div>
            <div
              class="grid w-full py-4 space-y-3 place-items-center lg:place-items-baseline lg:space-y-0 lg:mt-5 lg:py-4 lg:first:pt-0 lg:last:pb-0"
            >
              <div class="w-full">
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium text-white bg-[#5B53FF] rounded-md shadow-sm hover:bg-[#5237F9] transition-all duration-200 ease-in"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="absolute top-0 hidden translate-x-16 translate-y-16 right-[300px] lg:block">
        <svg
          class="w-16 h-auto text-orange-500" width="121" height="135" viewBox="0 0 121 135" fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 16.4754C11.7688 27.4499 21.2452 57.3224 5 89.0164" stroke="currentColor" stroke-width="10"
            stroke-linecap="round"
          />
          <path
            d="M33.6761 112.104C44.6984 98.1239 74.2618 57.6776 83.4821 5" stroke="currentColor"
            stroke-width="10" stroke-linecap="round"
          />
          <path
            d="M50.5525 130C68.2064 127.495 110.731 117.541 116 78.0874" stroke="currentColor"
            stroke-width="10" stroke-linecap="round"
          />
        </svg>
      </div>
      <div class="absolute hidden -translate-x-16 translate-y-16 bottom-10 left-48 lg:block">
        <svg
          class="w-56 h-auto text-cyan-500" width="347" height="188" viewBox="0 0 347 188" fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 82.4591C54.7956 92.8751 30.9771 162.782 68.2065 181.385C112.642 203.59 127.943 78.57 122.161 25.5053C120.504 2.2376 93.4028 -8.11128 89.7468 25.5053C85.8633 61.2125 130.186 199.678 180.982 146.248L214.898 107.02C224.322 95.4118 242.9 79.2851 258.6 107.02C274.299 134.754 299.315 125.589 309.861 117.539L343 93.4426"
            stroke="currentColor" stroke-width="7" stroke-linecap="round"
          />
        </svg>
      </div>
    </div>
  </section>
</template>
