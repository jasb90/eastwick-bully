import {defineField, defineType} from 'sanity'
import TrackWallPosition from '../components/TrackWallPosition'

export default defineType({
  name: 'track',
  title: 'Track',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: r => r.required()
    }),

    defineField({
      name: 'album',
      type: 'string'
    }),

    defineField({
      name: 'audio',
      title: 'Audio File',
      type: 'file',
      options: {accept: 'audio/mpeg,audio/mp3'},
      validation: r => r.required()
    }),

    defineField({
      name: 'color',
      type: 'string',
      description: 'Hex color (e.g. #FFB000)'
    }),

    defineField({
      name: 'tag',
      type: 'string'
    }),

    defineField({
      name: 'x',
      type: 'number',
      title: 'X Position (%)',
      components: { input: TrackWallPosition },
      validation: r => r.min(0).max(100)
    }),

    defineField({
      name: 'y',
      type: 'number',
      title: 'Y Position (%)',
      components: { input: TrackWallPosition },
      validation: r => r.min(0).max(100)
    }),

    defineField({
      name: 'order',
      type: 'number',
      description: 'Sort order (lower = first)'
    }),
  ],
})
