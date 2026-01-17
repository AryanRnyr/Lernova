import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  course_id: string;
  added_at: string;
  course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    current_price: number | null;
    is_free: boolean;
    thumbnail_url: string | null;
    instructor_id: string;
    instructor_name: string | null;
  };
}

export function useCart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          course_id,
          added_at,
          course:courses (
            id,
            title,
            slug,
            price,
            current_price,
            is_free,
            thumbnail_url,
            instructor_id
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Fetch instructor names for each course
      const cartItems = await Promise.all(
        (data || []).map(async (item: any) => {
          if (item.course?.instructor_id) {
            const { data: instructorData } = await supabase
              .rpc('get_instructor_profile', { instructor_user_id: item.course.instructor_id });
            const instructor = Array.isArray(instructorData) ? instructorData[0] : instructorData;
            return {
              ...item,
              course: {
                ...item.course,
                current_price: item.course?.current_price ?? item.course?.price ?? 0,
                instructor_name: instructor?.full_name || null,
              },
            };
          }
          return {
            ...item,
            course: {
              ...item.course,
              current_price: item.course?.current_price ?? item.course?.price ?? 0,
              instructor_name: null,
            },
          };
        })
      );

      setItems(cartItems);
      setCount(cartItems.length);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (courseId: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Please sign in',
        description: 'You need to sign in to add courses to cart',
      });
      return false;
    }

    try {
      // Check if already enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollment) {
        toast({
          variant: 'destructive',
          title: 'Already enrolled',
          description: 'You are already enrolled in this course',
        });
        return false;
      }

      // Check if already in cart
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Already in cart',
          description: 'This course is already in your cart',
        });
        return false;
      }

      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, course_id: courseId });

      if (error) throw error;

      toast({
        title: 'Added to cart',
        description: 'Course added to your cart',
      });

      await fetchCart();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add course to cart',
      });
      return false;
    }
  };

  const removeFromCart = async (courseId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;

      toast({
        title: 'Removed from cart',
        description: 'Course removed from your cart',
      });

      await fetchCart();
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove course from cart',
      });
      return false;
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setItems([]);
      setCount(0);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getTotal = () => {
    return items.reduce((total, item) => {
      if (item.course?.is_free) return total;
      const price = item.course?.current_price ?? item.course?.price ?? 0;
      return total + price;
    }, 0);
  };

  return {
    items,
    count,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    getTotal,
    refetch: fetchCart,
  };
}
