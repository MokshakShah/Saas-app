'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Logo from '../../../../public/cypresslogo.svg';
import Loader from '@/components/global/Loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailCheck } from 'lucide-react';
import { FormSchema } from '@/lib/types';
import { actionSignUpUser } from '@/lib/server-actions/auth-actions';
import { createClient } from '@/lib/supabase/browser';

const SignUpFormSchema = z
  .object({
    email: z.string().describe('Email').email({ message: 'Invalid Email' }),
    password: z
      .string()
      .describe('Password')
      .min(6, 'Password must be minimum 6 characters'),
    confirmPassword: z
      .string()
      .describe('Confirm Password')
      .min(6, 'Password must be minimum 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

const SignupContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState('');
  const [confirmation, setConfirmation] = useState(false);

  const codeExchangeError = useMemo(() => {
    if (!searchParams) return '';
    return searchParams.get('error_description');
  }, [searchParams]);

  const confirmationAndErrorStyles = useMemo(
    () =>
      clsx('bg-primary', {
        'bg-red-500/10': codeExchangeError,
        'border-red-500/50': codeExchangeError,
        'text-red-700': codeExchangeError,
      }),
    [codeExchangeError]
  );

  const form = useForm<z.infer<typeof SignUpFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: { 
      email: '', 
      password: '', 
      confirmPassword: '' 
    },
  });

  const isLoading = form.formState.isSubmitting;
  
  const onSubmit = async (data: z.infer<typeof SignUpFormSchema>) => {
    // Get values directly from form state as backup
    const formValues = form.getValues();
    console.log('Form submission data:', data);
    console.log('Form values from getValues():', formValues);
    
    // Use formValues if data is undefined
    const email = data.email || formValues.email;
    const password = data.password || formValues.password;
    const confirmPassword = data.confirmPassword || formValues.confirmPassword;
    
    console.log('Using values:', { email, password, confirmPassword });
    
    // Clear any previous errors
    setSubmitError('');
    
    try {
      // Validate the data before sending
      if (!email || !password) {
        setSubmitError('Email and password are required');
        return;
      }
      
      console.log('Calling server action with:', { email, password });
      
      // Call server action with simple object
      const result = await actionSignUpUser({ email, password });
      
      if (result.error) {
        console.error('Signup error:', result.error);
        setSubmitError(result.error.message);
        
        // Clear any partial session that might have been created
        const supabase = createClient();
        await supabase.auth.signOut();
        
        form.reset();
        return;
      }
      
      console.log('Signup successful, redirecting to dashboard');
      // Redirect immediately to dashboard since email confirmation is disabled
      router.replace('/dashboard');
    } catch (error) {
      console.error('Unexpected signup error:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      
      // Clear any partial session that might have been created
      const supabase = createClient();
      await supabase.auth.signOut();
      
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form
        onChange={() => {
          if (submitError) setSubmitError('');
        }}
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full sm:justify-center sm:w-[400px]
        space-y-6 flex
        flex-col
        "
      >
        <Link
          href="/"
          className="
          w-full
          flex
          justify-left
          items-center"
        >
          <Image
            src={Logo}
            alt="cypress Logo"
            width={50}
            height={50}
          />
          <span
            className="font-semibold
          dark:text-white text-4xl first-letter:ml-2"
          >
            cypress.
          </span>
        </Link>
        <FormDescription
          className="
        text-foreground/60"
        >
          An all-In-One Collaboration and Productivity Platform
        </FormDescription>
        {!confirmation && !codeExchangeError && (
          <>
            <FormField
              disabled={isLoading}
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Email"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        console.log('Email input changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isLoading}
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Password"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        console.log('Password input changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isLoading}
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        console.log('Confirm password input changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full p-6"
              disabled={isLoading}
            >
              {!isLoading ? 'Create Account' : <Loader />}
            </Button>
          </>
        )}

        {submitError && <FormMessage>{submitError}</FormMessage>}
        <span className="self-container">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary"
          >
            Login
          </Link>
        </span>
        {(confirmation || codeExchangeError) && (
          <>
            <Alert className={confirmationAndErrorStyles}>
              {!codeExchangeError && <MailCheck className="h-4 w-4" />}
              <AlertTitle>
                {codeExchangeError ? 'Invalid Link' : 'Check your email.'}
              </AlertTitle>
              <AlertDescription>
                {codeExchangeError || 'An email confirmation has been sent.'}
              </AlertDescription>
            </Alert>
          </>
        )}
      </form>
    </Form>
  );
};

const SignupFallback = () => (
  <div className="w-full sm:w-[400px] flex justify-center">
    <Loader />
  </div>
);

const Signup = () => {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupContent />
    </Suspense>
  );
};

export default Signup;
