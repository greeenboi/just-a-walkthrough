import type { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
	title: "Next.js SignIn Page | TailAdmin - Next.js Dashboard Template",
	description: "This is Next.js Signin Page TailAdmin Dashboard Template",
};

export default function SignIn() {
	return <SignInForm />;
}
