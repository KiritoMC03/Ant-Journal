import {defineCollection} from 'astro:content';
import {journalLoader} from './loader';
export const collections={vault:defineCollection({loader:journalLoader()})};
