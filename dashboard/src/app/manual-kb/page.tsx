import { Header } from '@/components/header';
import { KBEntries, columns } from './columns';
import { DataTable } from './data-table';

async function getData(): Promise<KBEntries[]> {
  return [
    {
      id: '1',
      title: 'How to create a new user',
      content:
        "To create a new user, you need to go to the Users page and click on the 'Create User' button. Fill in the required information and click on the 'Save' button to create the user.",
    },
    {
      id: '2',
      title: 'How to reset a password',
      content:
        "To reset a password, you need to go to the Users page and click on the 'Reset Password' button next to the user you want to reset the password for. Enter the new password and click on the 'Save' button to reset the password.",
    },
  ];
}

export default async function ManualKB() {
  const data = await getData();

  return (
    <>
      <Header />
      <main className="mb-10">
        <DataTable columns={columns} data={data} />
      </main>
    </>
  );
}
