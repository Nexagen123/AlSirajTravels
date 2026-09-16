import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="New Al Siraj Travel SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for New Al Siraj Travel"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
