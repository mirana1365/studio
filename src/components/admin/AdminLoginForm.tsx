// src/components/admin/AdminLoginForm.tsx
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { login } from "@/app/actions/authActions";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Loader2 } from 'lucide-react';

const loginFormSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است."),
  password: z.string().min(1, "رمز عبور الزامی است."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
}

export function AdminLoginForm({ onLoginSuccess }: AdminLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "admin", 
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("password", data.password);

    try {
      const result = await login(formData);
      if (result.success) {
        toast({ title: "ورود موفقیت آمیز بود", description: "به پنل مدیریت خوش آمدید." });
        onLoginSuccess();
      } else {
        toast({ variant: "destructive", title: "ورود ناموفق بود", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "خطا در ورود", description: "یک خطای غیرمنتظره رخ داد." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ورود مدیر</CardTitle>
          <CardDescription>برای دسترسی به پنل مدیریت، اطلاعات کاربری خود را وارد کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="username">نام کاربری</FormLabel>
                    <FormControl>
                      <Input id="username" placeholder="ادمین" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">رمز عبور</FormLabel>
                    <FormControl>
                      <Input id="password" type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                ورود
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
                دسترسی به این بخش محدود است.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
