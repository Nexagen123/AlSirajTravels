import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Qafla-e-Sagir Travel SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for Qafla-e-Sagir Travel"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
