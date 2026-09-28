<template>
  <UniversalRichText v-bind="$attrs" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import UniversalRichText from './UniversalRichText.vue';

export default defineComponent({
  name: 'OmniRichText',
  components: {
    UniversalRichText
  }
});
</script>
