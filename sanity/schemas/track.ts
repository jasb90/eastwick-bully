import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'track',
  title: 'Track',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: r => r.required()}),
    defineField({name: 'album', type: 'string'}),
    defineField({
      name: 'audio',
      title: 'Audio File',
      type: 'file',
      options: {accept: 'audio/mpeg,audio/mp3'},
      validation: r => r.required()
    }),
    defineField({name: 'color', type: 'string', description: 'Hex color (e.g. #FFB000)'}),
    defineField({name: 'tag', type: 'string'}),
    defineField({name: 'x', type: 'number', description: 'Tag X position (0–100)'}),
    defineField({name: 'y', type: 'number', description: 'Tag Y position (0–100)'}),
    defineField({name: 'order', type: 'number', description: 'Sort order (lower = first)'}),
  ],
})
