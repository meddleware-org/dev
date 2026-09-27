<script setup lang="ts">
import { AppFooter } from '@meddleware/ui';
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AppFooter>
        <CopyrightLine symbolVariant="kopimi" organisation-name="Meddleware" rightsStatement="jam" />
      </AppFooter>
    </template>
  </Layout>
</template>
