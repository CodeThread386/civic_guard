import { redirect } from 'next/navigation';

export default function AuthRegisterPage() {
  redirect('/auth?role=user&mode=signup');
}
