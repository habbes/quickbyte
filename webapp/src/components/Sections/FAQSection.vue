<template>
  <Container>
    <div id="#faqs" class="pt-20 space-y-16">
      <div class="grid space-y-4 place-items-center">
        <h1 class="text-3xl font-bold text-center text-white md:text-start">
          Frequently asked questions
        </h1>
        <p class="max-w-sm text-center text-gray-200">
          Have questions about Quickbyte? We have the answers.
        </p>
      </div>

      <div class="relative flex justify-center w-full overflow-hidden">
        <div class="relative w-full max-w-2xl">
          <div class="grid gap-4 md:gap-6">
            <Accordion>
              <template #title>
                When does the free trial end? And what happens after?
              </template>

              <p>
                Quickbyte has not started charging and is currently free to use.
                Eventually we'll open up our paid plans and start charging. At that point
                the free tier might change (e.g. increased usage limits). If your usage
                will be above the free tier limit, you will be invited to move to the
                paid tiers (possibly at a discount). You will be notified at least 2
                months in advance before you need to move to paid plan. Note that we're still
                figuring out the right pricing model and currently listed prices and plans are estimates
                that are subject to change.
              </p>
            </Accordion>

            <!-- <Accordion>
              <template #title>
                How do I send the sharing link to someone?
              </template>

              <p>
                You can copy and paste the link provided by Quickbyte after your files have been
                successfully transferred and send the link to anyone you want.
              </p>
            </Accordion>

            <Accordion>
              <template #title>
                Is there a limit to how many times I can use Quickbyte?
              </template>

              <p>
                No. There is no limit to how many times you can use Quickbyte. Use it as much as you
                like.
              </p>
            </Accordion> -->
          </div>
        </div>
      </div>
    </div>
  </Container>
</template>

<script setup lang="ts">
import Container from '@/components/Base/Container.vue'
import Accordion from '@/components/Base/Accordion.vue'
</script>
