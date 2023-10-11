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
                How big of a file can I send?
              </template>

              <p>
                With Quickbyte you can send up to 200GB per transfer.
              </p>
            </Accordion>

            <Accordion>
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
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  </Container>
</template>
