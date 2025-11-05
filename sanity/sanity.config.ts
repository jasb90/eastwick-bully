import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'EW Bully CMS',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'l2oqi19n',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  basePath: '/secret-admin', // Studio will mount at this route in your Next app
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
