alter table public.documents
drop constraint if exists documents_status_check;

alter table public.documents
add constraint documents_status_check
check (status in ('UPLOADING', 'STORED', 'PROCESSING', 'READY', 'FAILED', 'DELETING'));

update public.documents
set
  status = 'STORED',
  error_message = '文件已保存，学校文档处理服务尚未接通。'
where status = 'PROCESSING' and kb_document_id is null;

update storage.buckets
set file_size_limit = 104857600
where id = 'documents';
