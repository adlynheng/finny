import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { isExisting, type Save } from '@/lib/save';
import { unwrap } from '@/lib/unwrap';
import type {
  CategoryInsert,
  CategoryKind,
  CategoryUpdate,
} from '@/types/domain';

/**
 * Expense and deposit categories share one table but Settings shows them in separate panels, so
 * each panel passes its kind. With no kind, both are returned.
 */
export function useCategories(kind?: CategoryKind) {
  return useQuery({
    queryKey: queryKeys.categories.list(kind),
    queryFn: async () => {
      const query = supabase.from('category').select('*');
      return unwrap(
        await (kind ? query.eq('kind', kind) : query).order('name'),
      );
    },
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
}

/**
 * Inserts a new category, or updates the given fields of one when the row carries its id.
 * Resolves to the saved row.
 */
export function useUpsertCategory() {
  const onSettled = useInvalidateCategories();
  return useMutation({
    mutationFn: async (category: Save<CategoryInsert, CategoryUpdate>) => {
      if (isExisting(category)) {
        const { id, ...fields } = category;
        return unwrap(
          await supabase
            .from('category')
            .update(fields)
            .eq('id', id)
            .select()
            .single(),
        );
      }
      return unwrap(
        await supabase.from('category').insert(category).select().single(),
      );
    },
    onSettled,
  });
}

export function useDeleteCategory() {
  const onSettled = useInvalidateCategories();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await supabase.from('category').delete().eq('id', id));
    },
    onSettled,
  });
}
