import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { app } from './app';
import { backfillClientStorageFolders } from './services/clientStorageFolder.service';

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Cria as pastas no storage dos clientes que ainda não têm (não bloqueia a inicialização)
  setTimeout(() => {
    backfillClientStorageFolders().catch(error =>
      console.error('[Storage] Falha ao criar pastas de clientes:', error?.message || error));
  }, 5000);
});

// Trigger redeploy due to transient infrastructure issue

