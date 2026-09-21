<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { isDark } = useData()
const { Layout } = DefaultTheme
</script>

<template>
  <div class="layout-wrapper">
    <Layout>
      <template #doc-footer-before>
        <div class="footer-copyright">
          <CopyrightLine symbolVariant="kopimi" organisation-name="Meddleware" rightsStatement="jam" />
        </div>
      </template>
    </Layout>
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: contents;
}

.footer-copyright {
  text-align: center;
  padding: 2rem 0;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 2rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}
</style>
