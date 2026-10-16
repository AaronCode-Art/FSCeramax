import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import "../css/admin.css";
import type { TableColumn } from "../../../components/ui/DataTable";
import { DataTable } from "../../../components/ui/DataTable";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { PageHeading } from "../../../components/ui/PageHeading";
import { useAuth } from "../../../hooks/useAuth";
import { descargarExcelFiltrado } from "../../../services/excelExport";
import {
  createWarehouse,
  createBranch,
  deactivateWarehouse,
  listBranches,
  listWarehouses,
  updateBranch,
  updateWarehouse,
  type Branch,
  type BranchInput,
  type Warehouse,
  type WarehouseInput,
} from "../../inventario/services/inventarioService";
import {
  createUser,
  listUserRoles,
  listUsers,
  updateUser,
  type UserInput,
  type UserRecord,
  type UserRole,
} from "../services/usuarioService";
import {
  createClient,
  updateClient,
  listClients,
  listUbigeos,
  type ClientCreateInput,
  type ClientRecord,
  type ClientUpdateInput,
  type UbigeoEntry,
} from "../../cliente/services/clienteService";

interface WarehouseDraft {
  nombre: string;
  sucursalId: string;
}

interface BranchDraft {
  nombre: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  referencia: string;
  codigoPostal: string;
  idUbigeo: string;
  activo: boolean;
}

function branchToDraft(branch: Branch): BranchDraft {
  return {
    nombre: branch.nombre,
    departamento: branch.departamento,
    provincia: branch.provincia,
    distrito: branch.distrito,
    direccion: branch.direccion,
    referencia: branch.referencia ?? "",
    codigoPostal: branch.codigoPostal ?? "",
    idUbigeo: branch.idUbigeo ?? "",
    activo: branch.activo,
  };
}

export function BranchesPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const isAdmin = session?.rol === "ADMIN";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BranchDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBranches(token);
      setBranches(result.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las sucursales.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void listBranches(token)
      .then((result) => {
        if (isCurrent) setBranches(result.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las sucursales.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const visibleBranches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return branches;
    return branches.filter((branch) =>
      [branch.codigo, branch.nombre, branch.departamento, branch.provincia, branch.distrito, branch.direccion]
        .some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [branches, search]);

  function startCreate() {
    setEditingId(null);
    setDraft({
      nombre: "",
      departamento: "",
      provincia: "",
      distrito: "",
      direccion: "",
      referencia: "",
      codigoPostal: "",
      idUbigeo: "",
      activo: true,
    });
    setError(null);
  }

  function startEdit(branch: Branch) {
    setEditingId(branch.id);
    setDraft(branchToDraft(branch));
    setError(null);
  }

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const input: BranchInput = {
      nombre: draft.nombre.trim(),
      departamento: draft.departamento.trim(),
      provincia: draft.provincia.trim(),
      distrito: draft.distrito.trim(),
      direccion: draft.direccion.trim(),
      referencia: draft.referencia.trim(),
      codigoPostal: draft.codigoPostal.trim(),
      idUbigeo: draft.idUbigeo.trim(),
      activo: draft.activo,
    };
    try {
      const saved = editingId
        ? await updateBranch(editingId, input, token)
        : await createBranch(input, token);
      setBranches((current) => {
        const updated = editingId
          ? current.map((branch) => branch.id === saved.id ? saved : branch)
          : [...current, saved];
        return updated.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      setDraft(null);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la sucursal.");
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<Branch>[] = [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Sucursal" },
    { key: "departamento", label: "Departamento" },
    { key: "provincia", label: "Provincia" },
    { key: "distrito", label: "Distrito" },
    { key: "direccion", label: "Dirección" },
    {
      key: "activo",
      label: "Estado",
      render: (branch) => <span className={`category-status ${branch.activo ? "is-active" : "is-inactive"}`}>
        {branch.activo ? "Activa" : "Inactiva"}
      </span>,
    },
    ...(isAdmin ? [{
      key: "id" as keyof Branch,
      label: "Acciones",
      render: (branch: Branch) => <button className="secondary-button category-action" type="button" onClick={() => startEdit(branch)}>Editar</button>,
    }] : []),
  ];

  return <>
    <PageHeading
      title="Sucursales"
      description="Administra las sedes y sus direcciones para asociar almacenes."
      action={isAdmin ? <button className="primary-button" type="button" onClick={startCreate}><Icon name="plus" size={17}/>Nueva sucursal</button> : undefined}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Sucursales registradas</h2><p>{branches.length} {branches.length === 1 ? "sucursal" : "sucursales"}</p></div>
        <label className="category-search">
          <Icon name="search" size={17}/>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre o ubicación" aria-label="Buscar sucursales"/>
        </label>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {!draft && <button className="secondary-button category-action" type="button" onClick={() => void loadBranches()}>Reintentar</button>}
      </div>}
      {loading
        ? <div className="category-message" role="status">Cargando sucursales…</div>
        : error && branches.length === 0
          ? <EmptyState title="No se pudieron cargar las sucursales" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleBranches}
            rowKey={(branch) => branch.id}
            emptyTitle={search ? "No se encontraron sucursales" : "Aún no hay sucursales"}
            emptyDescription={search ? "Prueba con otro código o ubicación." : "Crea una sucursal antes de registrar sus almacenes."}
          />}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="branch-form-title">
        <div className="category-modal-heading">
          <div><h2 id="branch-form-title">{editingId ? "Editar sucursal" : "Nueva sucursal"}</h2><p>Ingresa los datos de ubicación de la sede.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveBranch(event)}>
          <div className="form-grid category-form-grid">
            <label>Nombre<input required maxLength={80} value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} autoFocus/></label>
            <label>Departamento<input required maxLength={60} value={draft.departamento} onChange={(event) => setDraft({ ...draft, departamento: event.target.value })}/></label>
            <label>Provincia<input required maxLength={60} value={draft.provincia} onChange={(event) => setDraft({ ...draft, provincia: event.target.value })}/></label>
            <label>Distrito<input required maxLength={60} value={draft.distrito} onChange={(event) => setDraft({ ...draft, distrito: event.target.value })}/></label>
            <label className="wide">Dirección<input required maxLength={200} value={draft.direccion} onChange={(event) => setDraft({ ...draft, direccion: event.target.value })}/></label>
            <label>Referencia<input maxLength={250} value={draft.referencia} onChange={(event) => setDraft({ ...draft, referencia: event.target.value })}/></label>
            <label>Código postal<input maxLength={10} value={draft.codigoPostal} onChange={(event) => setDraft({ ...draft, codigoPostal: event.target.value })}/></label>
            <label>ID Ubigeo<input maxLength={6} value={draft.idUbigeo} onChange={(event) => setDraft({ ...draft, idUbigeo: event.target.value })}/></label>
            <label className="category-active-field"><input type="checkbox" checked={draft.activo} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })}/>Sucursal activa</label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear sucursal"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

export function WarehousesPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const isAdmin = session?.rol === "ADMIN";
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WarehouseDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [warehouseResult, branchResult] = await Promise.all([listWarehouses(token), listBranches(token)]);
      setWarehouses(warehouseResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setBranches(branchResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los almacenes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([listWarehouses(token), listBranches(token)])
      .then(([warehouseResult, branchResult]) => {
        if (isCurrent) {
          setWarehouses(warehouseResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
          setBranches(branchResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los almacenes.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const visibleWarehouses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return warehouses;
    return warehouses.filter((warehouse) =>
      [warehouse.codigo, warehouse.nombre, warehouse.sucursalNombre]
        .some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [warehouses, search]);

  const activeBranches = branches.filter((branch) => branch.activo);

  function startCreate() {
    setEditingId(null);
    setDraft({ nombre: "", sucursalId: activeBranches[0]?.id ?? "" });
    setError(null);
  }

  function startEdit(warehouse: Warehouse) {
    setEditingId(warehouse.id);
    setDraft({ nombre: warehouse.nombre, sucursalId: warehouse.sucursalId });
    setError(null);
  }

  async function saveWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const input: WarehouseInput = {
      nombre: draft.nombre.trim(),
      sucursalId: draft.sucursalId,
      activo: true,
    };
    try {
      const saved = editingId
        ? await updateWarehouse(editingId, input, token)
        : await createWarehouse(input, token);
      setWarehouses((current) => {
        const updated = editingId
          ? current.map((warehouse) => warehouse.id === saved.id ? saved : warehouse)
          : [...current, saved];
        return updated.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      setDraft(null);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el almacén.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(warehouse: Warehouse) {
    if (!window.confirm(`¿Desactivar el almacén "${warehouse.nombre}"?`)) return;
    setDeactivatingId(warehouse.id);
    setError(null);
    try {
      await deactivateWarehouse(warehouse.id, token);
      setWarehouses((current) => current.filter((item) => item.id !== warehouse.id));
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "No se pudo desactivar el almacén.");
    } finally {
      setDeactivatingId(null);
    }
  }

  const columns: TableColumn<Warehouse>[] = [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Almacén" },
    { key: "sucursalNombre", label: "Sucursal" },
    {
      key: "activo",
      label: "Estado",
      render: (warehouse) => <span className={`category-status ${warehouse.activo ? "is-active" : "is-inactive"}`}>
        {warehouse.activo ? "Activo" : "Inactivo"}
      </span>,
    },
    ...(isAdmin ? [{
      key: "id" as keyof Warehouse,
      label: "Acciones",
      render: (warehouse: Warehouse) => <div className="category-actions">
        <button className="secondary-button category-action" type="button" onClick={() => startEdit(warehouse)}>Editar</button>
        <button
          className="secondary-button category-action category-deactivate"
          type="button"
          disabled={deactivatingId === warehouse.id}
          onClick={() => void handleDeactivate(warehouse)}
        >{deactivatingId === warehouse.id ? "Desactivando…" : "Desactivar"}</button>
      </div>,
    }] : []),
  ];

  function exportarAlmacenes() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: "ceramax-almacenes.xlsx",
        nombreHoja: "Almacenes",
        encabezados: ["Código", "Almacén", "Sucursal", "Estado"],
        filas: visibleWarehouses.map((warehouse) => [
          warehouse.codigo,
          warehouse.nombre,
          warehouse.sucursalNombre,
          warehouse.activo ? "Activo" : "Inactivo",
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudieron exportar los almacenes.");
    }
  }

  return <>
    <PageHeading
      title="Almacenes"
      description="Consulta y administra los almacenes activos de tus sucursales."
      action={<>
        <button className="secondary-button" type="button" onClick={exportarAlmacenes} disabled={loading || visibleWarehouses.length === 0}>Descargar Excel</button>
        {isAdmin && <button className="primary-button" type="button" onClick={startCreate} disabled={activeBranches.length === 0}><Icon name="plus" size={17}/>Nuevo almacén</button>}
      </>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Almacenes registrados</h2><p>{warehouses.length} {warehouses.length === 1 ? "almacén activo" : "almacenes activos"}</p></div>
        <label className="category-search">
          <Icon name="search" size={17}/>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, almacén o sucursal"
            aria-label="Buscar almacenes"
          />
        </label>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {!draft && <button className="secondary-button category-action" type="button" onClick={() => void loadWarehouses()}>Reintentar</button>}
      </div>}
      {isAdmin && activeBranches.length === 0 && !loading && !error && <div className="category-error" role="status">No hay sucursales activas para asociar a un almacén.</div>}
      {loading
        ? <div className="category-message" role="status">Cargando almacenes…</div>
        : error && warehouses.length === 0
          ? <EmptyState title="No se pudieron cargar los almacenes" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleWarehouses}
            rowKey={(warehouse) => warehouse.id}
            emptyTitle={search ? "No se encontraron almacenes" : "Aún no hay almacenes"}
            emptyDescription={search ? "Prueba con otro código, almacén o sucursal." : "Los almacenes activos aparecerán aquí."}
          />}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal" role="dialog" aria-modal="true" aria-labelledby="warehouse-form-title">
        <div className="category-modal-heading">
          <div><h2 id="warehouse-form-title">{editingId ? "Editar almacén" : "Nuevo almacén"}</h2><p>Asocia el almacén a una sucursal activa.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveWarehouse(event)}>
          <div className="form-grid category-form-grid">
            <label className="wide">Nombre del almacén
              <input required maxLength={80} value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} autoFocus/>
            </label>
            <label className="wide">Sucursal
              <select required value={draft.sucursalId} onChange={(event) => setDraft({ ...draft, sucursalId: event.target.value })}>
                <option value="" disabled>Selecciona una sucursal</option>
                {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.codigo} — {branch.nombre}</option>)}
              </select>
            </label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving || activeBranches.length === 0}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear almacén"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

const documentTypes = ["DNI", "RUC", "CE", "PASAPORTE"] as const;

interface UserDraft extends UserInput {}

function newUserDraft(roles: UserRole[]): UserDraft {
  return {
    codigo: "",
    rolId: roles[0]?.id ?? "",
    sucursalId: null,
    tipoDocumento: "DNI",
    numeroDocumento: "",
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    telefono: "",
    activo: true,
  };
}

export function UsersPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const [userResult, roleResult, branchResult] = await Promise.all([
        listUsers(token),
        listUserRoles(token),
        listBranches(token),
      ]);
      setUsers(userResult);
      setRoles(roleResult);
      setBranches(branchResult);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([listUsers(token), listUserRoles(token), listBranches(token)])
      .then(([userResult, roleResult, branchResult]) => {
        if (isCurrent) {
          setUsers(userResult);
          setRoles(roleResult);
          setBranches(branchResult);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return users.filter((user) =>
      (!roleFilter || user.rolId === roleFilter)
      && (statusFilter === "all" || user.activo === (statusFilter === "active"))
      && (!term || [
        user.codigo,
        user.nombres,
        user.apellidos,
        user.email,
        user.tipoDocumento,
        user.numeroDocumento,
        user.rolCodigo,
        user.telefono ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [roleFilter, search, statusFilter, users]);

  function startCreate() {
    setEditingUser(null);
    setDraft(newUserDraft(roles));
    setError(null);
  }

  function startEdit(user: UserRecord) {
    setEditingUser(user);
    setDraft({
      codigo: user.codigo,
      rolId: user.rolId,
      sucursalId: user.sucursalId,
      tipoDocumento: user.tipoDocumento,
      numeroDocumento: user.numeroDocumento,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      password: "",
      telefono: user.telefono ?? "",
      activo: user.activo,
    });
    setError(null);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const input: UserInput = {
      ...draft,
      codigo: draft.codigo.trim(),
      nombres: draft.nombres.trim(),
      apellidos: draft.apellidos.trim(),
      email: draft.email.trim().toLocaleLowerCase(),
      numeroDocumento: draft.numeroDocumento.trim(),
      telefono: draft.telefono.trim(),
      password: draft.password,
    };
    try {
      const saved = editingUser
        ? await updateUser(editingUser.id, input, token)
        : await createUser(input, token);
      setUsers((current) => {
        const updated = editingUser
          ? current.map((user) => user.id === saved.id ? saved : user)
          : [saved, ...current];
        return updated.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      });
      setDraft(null);
      setEditingUser(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<UserRecord>[] = [
    { key: "codigo", label: "Código" },
    {
      key: "nombres",
      label: "Usuario",
      render: (user) => <><strong>{user.nombres} {user.apellidos}</strong><small>{user.tipoDocumento}: {user.numeroDocumento}</small></>,
    },
    {
      key: "email",
      label: "Correo",
      render: (user) => <>{user.email}{user.telefono && <small>{user.telefono}</small>}</>,
    },
    {
      key: "rolCodigo",
      label: "Rol",
      render: (user) => roles.find((role) => role.id === user.rolId)?.nombre ?? user.rolCodigo,
    },
    {
      key: "sucursalId",
      label: "Sucursal",
      render: (user) => branches.find((branch) => branch.id === user.sucursalId)?.nombre ?? "—",
    },
    {
      key: "activo",
      label: "Estado",
      render: (user) => <span className={`category-status ${user.activo ? "is-active" : "is-inactive"}`}>
        {user.activo ? "Activo" : "Inactivo"}
      </span>,
    },
    {
      key: "id",
      label: "Acciones",
      render: (user) => <button className="secondary-button category-action" type="button" onClick={() => startEdit(user)}>Editar</button>,
    },
  ];

  return <>
    <PageHeading
      title="Usuarios"
      description="Administra las cuentas del sistema, sus roles y estado de acceso."
      action={<button className="primary-button" type="button" onClick={startCreate} disabled={roles.length === 0}><Icon name="plus" size={17}/>Nuevo usuario</button>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Usuarios registrados</h2><p>{visibleUsers.length} de {users.length} cuentas</p></div>
        <div className="admin-filters">
          <label className="category-search">
            <Icon name="search" size={17}/>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, correo o documento" aria-label="Buscar usuarios"/>
          </label>
          <label className="admin-filter-select"><span>Rol</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Todos</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
            </select>
          </label>
          <label className="admin-filter-select"><span>Estado</span>
            <select value={statusFilter} onChange={(event) => {
              if (event.target.value === "all" || event.target.value === "active" || event.target.value === "inactive") {
                setStatusFilter(event.target.value);
              }
            }}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {!draft && <button className="secondary-button category-action" type="button" onClick={() => {
          setLoading(true);
          void loadUsers();
        }}>Reintentar</button>}
      </div>}
      {loading
        ? <div className="category-message" role="status">Cargando usuarios…</div>
        : error && users.length === 0
          ? <EmptyState title="No se pudieron cargar los usuarios" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleUsers}
            rowKey={(user) => user.id}
            emptyTitle={users.length === 0 ? "Aún no hay usuarios" : "No se encontraron usuarios"}
            emptyDescription={users.length === 0 ? "Las cuentas del sistema aparecerán aquí." : "Prueba con otro término, rol o estado."}
          />}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
        <div className="category-modal-heading">
          <div><h2 id="user-form-title">{editingUser ? "Editar usuario" : "Nuevo usuario"}</h2><p>Configura los datos de acceso y el rol de la cuenta.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveUser(event)}>
          <div className="form-grid category-form-grid">
            <label>Código de personal
              <input required maxLength={editingUser ? 20 : 8} value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} autoFocus/>
            </label>
            <label>Rol
              <select required value={draft.rolId} onChange={(event) => setDraft({ ...draft, rolId: event.target.value })}>
                <option value="" disabled>Selecciona un rol</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre} ({role.codigo})</option>)}
              </select>
            </label>
            <label>Nombres
              <input required maxLength={80} value={draft.nombres} onChange={(event) => setDraft({ ...draft, nombres: event.target.value })}/>
            </label>
            <label>Apellidos
              <input required maxLength={80} value={draft.apellidos} onChange={(event) => setDraft({ ...draft, apellidos: event.target.value })}/>
            </label>
            <label>Correo electrónico
              <input required type="email" maxLength={120} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })}/>
            </label>
            <label>{editingUser ? "Nueva contraseña (opcional)" : "Contraseña"}
              <input required={!editingUser} type="password" minLength={8} maxLength={100} autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })}/>
            </label>
            <label>Tipo de documento
              <select value={draft.tipoDocumento} onChange={(event) => {
                if (documentTypes.some((type) => type === event.target.value)) {
                  setDraft({ ...draft, tipoDocumento: event.target.value });
                }
              }}>
                {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>Número de documento
              <input required maxLength={20} value={draft.numeroDocumento} onChange={(event) => setDraft({ ...draft, numeroDocumento: event.target.value })}/>
            </label>
            <label>Teléfono
              <input maxLength={20} value={draft.telefono} onChange={(event) => setDraft({ ...draft, telefono: event.target.value })}/>
            </label>
            <label>Sucursal
              <select value={draft.sucursalId ?? ""} onChange={(event) => setDraft({ ...draft, sucursalId: event.target.value || null })}>
                <option value="">Sin sucursal</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.codigo} — {branch.nombre}{branch.activo ? "" : " (inactiva)"}</option>)}
              </select>
            </label>
            <label className="wide category-active-field">
              <input type="checkbox" checked={draft.activo} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })}/>
              Cuenta activa
            </label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving || roles.length === 0}>{saving ? "Guardando…" : editingUser ? "Guardar cambios" : "Crear usuario"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

const clientDocumentTypes = ["DNI", "RUC", "CE", "PASAPORTE"] as const;

interface ClientDraft extends ClientCreateInput {
  activo: boolean;
}

function newClientDraft(): ClientDraft {
  return {
    tipoDocumento: "DNI",
    numeroDocumento: "",
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    telefono: "",
    departamento: "",
    provincia: "",
    distrito: "",
    direccion: "",
    codigoPostal: "",
    referencia: "",
    idUbigeo: "",
    activo: true,
  };
}

function clientDocumentPattern(type: string): string {
  if (type === "DNI") return "[0-9]{8}";
  if (type === "RUC") return "[0-9]{11}";
  return "[A-Za-z0-9]{1,20}";
}

function findUbigeoPath(ubigeos: UbigeoEntry[], districtId: string) {
  for (const department of ubigeos) {
    for (const province of department.childrens) {
      const district = province.childrens.find((entry) => entry.id === districtId);
      if (district) return { department, province, district };
    }
  }
  return null;
}

export function ClientsPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [ubigeos, setUbigeos] = useState<UbigeoEntry[]>([]);
  const [ubigeoLoading, setUbigeoLoading] = useState(true);
  const [ubigeoError, setUbigeoError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [provinceId, setProvinceId] = useState("");

  const loadClients = useCallback(async () => {
    try {
      const result = await listClients(token);
      setClients(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void listClients(token)
      .then((result) => {
        if (isCurrent) {
          setClients(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los clientes.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const loadUbigeos = useCallback(async () => {
    try {
      setUbigeos(await listUbigeos());
      setUbigeoError(null);
    } catch (loadError) {
      setUbigeoError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catálogo UBIGEO.");
    } finally {
      setUbigeoLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void listUbigeos()
      .then((result) => {
        if (isCurrent) {
          setUbigeos(result);
          setUbigeoError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setUbigeoError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catálogo UBIGEO.");
      })
      .finally(() => {
        if (isCurrent) setUbigeoLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const geoSelection = useMemo(() => findUbigeoPath(ubigeos, draft?.idUbigeo ?? ""), [draft?.idUbigeo, ubigeos]);
  const selectedDepartmentId = departmentId || geoSelection?.department.id || "";
  const selectedProvinceId = provinceId || geoSelection?.province.id || "";
  const availableProvinces = ubigeos.find((department) => department.id === selectedDepartmentId)?.childrens ?? [];
  const availableDistricts = availableProvinces.find((province) => province.id === selectedProvinceId)?.childrens ?? [];
  const selectedDistrictId = geoSelection?.district.id ?? "";

  const visibleClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return clients.filter((client) =>
      (statusFilter === "all" || client.activo === (statusFilter === "active"))
      && (!term || [
        client.codigo,
        client.nombres,
        client.apellidos,
        client.email,
        client.tipoDocumento,
        client.numeroDocumento,
        client.telefono,
        client.departamento,
        client.provincia,
        client.distrito,
        client.direccion,
      ].some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [clients, search, statusFilter]);

  function startCreate() {
    setEditingClient(null);
    setDraft(newClientDraft());
    setDepartmentId("");
    setProvinceId("");
    setError(null);
  }

  function startEdit(client: ClientRecord) {
    const path = findUbigeoPath(ubigeos, client.idUbigeo);
    setEditingClient(client);
    setDraft({
      tipoDocumento: client.tipoDocumento,
      numeroDocumento: client.numeroDocumento,
      nombres: client.nombres,
      apellidos: client.apellidos,
      email: client.email,
      password: "",
      telefono: client.telefono,
      departamento: client.departamento,
      provincia: client.provincia,
      distrito: client.distrito,
      direccion: client.direccion,
      codigoPostal: client.codigoPostal,
      referencia: client.referencia,
      idUbigeo: client.idUbigeo,
      activo: client.activo,
    });
    setDepartmentId(path?.department.id ?? "");
    setProvinceId(path?.province.id ?? "");
    setError(null);
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const data: ClientCreateInput = {
      tipoDocumento: draft.tipoDocumento,
      numeroDocumento: draft.numeroDocumento.trim(),
      nombres: draft.nombres.trim(),
      apellidos: draft.apellidos.trim(),
      email: draft.email.trim().toLocaleLowerCase(),
      password: draft.password,
      telefono: draft.telefono.trim(),
      departamento: draft.departamento.trim(),
      provincia: draft.provincia.trim(),
      distrito: draft.distrito.trim(),
      direccion: draft.direccion.trim(),
      codigoPostal: draft.codigoPostal.trim(),
      referencia: draft.referencia.trim(),
      idUbigeo: draft.idUbigeo.trim(),
    };
    try {
      const saved = editingClient
        ? await updateClient(editingClient.id, { ...data, activo: draft.activo } satisfies ClientUpdateInput, token)
        : await createClient(data, token);
      setClients((current) => {
        const updated = editingClient
          ? current.map((client) => client.id === saved.id ? saved : client)
          : [saved, ...current];
        return updated.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      });
      setDraft(null);
      setEditingClient(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<ClientRecord>[] = [
    { key: "codigo", label: "Código" },
    {
      key: "nombres",
      label: "Cliente",
      render: (client) => <><strong>{client.nombres} {client.apellidos}</strong><small>{client.tipoDocumento}: {client.numeroDocumento}</small></>,
    },
    {
      key: "email",
      label: "Contacto",
      render: (client) => <>{client.email}<small>{client.telefono}</small></>,
    },
    {
      key: "direccion",
      label: "Ubicación",
      render: (client) => <>{client.direccion}<small>{[client.distrito, client.provincia, client.departamento].filter(Boolean).join(", ")}</small></>,
    },
    {
      key: "activo",
      label: "Estado",
      render: (client) => <span className={`category-status ${client.activo ? "is-active" : "is-inactive"}`}>
        {client.activo ? "Activo" : "Inactivo"}
      </span>,
    },
    {
      key: "id",
      label: "Acciones",
      render: (client) => <button className="secondary-button category-action" type="button" onClick={() => startEdit(client)}>Editar</button>,
    },
  ];

  return <>
    <PageHeading
      title="Clientes"
      description="Consulta y administra las cuentas, datos de contacto y direcciones de los clientes."
      action={<button className="primary-button" type="button" onClick={startCreate}><Icon name="plus" size={17}/>Nuevo cliente</button>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Clientes registrados</h2><p>{visibleClients.length} de {clients.length} clientes</p></div>
        <div className="admin-filters">
          <label className="category-search">
            <Icon name="search" size={17}/>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, correo o documento" aria-label="Buscar clientes"/>
          </label>
          <label className="admin-filter-select"><span>Estado</span>
            <select value={statusFilter} onChange={(event) => {
              if (event.target.value === "all" || event.target.value === "active" || event.target.value === "inactive") {
                setStatusFilter(event.target.value);
              }
            }}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {!draft && <button className="secondary-button category-action" type="button" onClick={() => {
          setLoading(true);
          void loadClients();
        }}>Reintentar</button>}
      </div>}
      {loading
        ? <div className="category-message" role="status">Cargando clientes…</div>
        : error && clients.length === 0
          ? <EmptyState title="No se pudieron cargar los clientes" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleClients}
            rowKey={(client) => client.id}
            emptyTitle={clients.length === 0 ? "Aún no hay clientes" : "No se encontraron clientes"}
            emptyDescription={clients.length === 0 ? "Las cuentas de clientes aparecerán aquí." : "Prueba con otro término o estado."}
          />}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="client-form-title">
        <div className="category-modal-heading">
          <div><h2 id="client-form-title">{editingClient ? "Editar cliente" : "Nuevo cliente"}</h2><p>Completa los datos de identidad, contacto y dirección.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveClient(event)}>
          <div className="form-grid category-form-grid">
            {editingClient && <label>Código<input value={editingClient.codigo} disabled/></label>}
            <label>Tipo de documento
              <select value={draft.tipoDocumento} onChange={(event) => {
                if (clientDocumentTypes.some((type) => type === event.target.value)) {
                  setDraft({ ...draft, tipoDocumento: event.target.value, numeroDocumento: "" });
                }
              }}>
                {clientDocumentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>Número de documento
              <input required maxLength={20} pattern={clientDocumentPattern(draft.tipoDocumento)} value={draft.numeroDocumento} onChange={(event) => setDraft({ ...draft, numeroDocumento: event.target.value })} title={draft.tipoDocumento === "DNI" ? "DNI debe tener 8 dígitos." : draft.tipoDocumento === "RUC" ? "RUC debe tener 11 dígitos." : "Usa solo letras y números."}/>
            </label>
            <label>Nombres
              <input required maxLength={80} value={draft.nombres} onChange={(event) => setDraft({ ...draft, nombres: event.target.value })}/>
            </label>
            <label>Apellidos
              <input required maxLength={80} value={draft.apellidos} onChange={(event) => setDraft({ ...draft, apellidos: event.target.value })}/>
            </label>
            <label>Correo electrónico
              <input required type="email" maxLength={120} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })}/>
            </label>
            <label>{editingClient ? "Nueva contraseña (opcional)" : "Contraseña"}
              <input required={!editingClient} type="password" minLength={8} maxLength={100} autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })}/>
            </label>
            <label>Teléfono
              <input required inputMode="numeric" pattern="9[0-9]{8}" maxLength={9} value={draft.telefono} onChange={(event) => setDraft({ ...draft, telefono: event.target.value })} title="Debe iniciar con 9 y tener 9 dígitos."/>
            </label>
            {ubigeoError && <div className="category-error wide" role="alert">
              <span>{ubigeoError}</span>
              <button className="secondary-button category-action" type="button" disabled={ubigeoLoading} onClick={() => {
                setUbigeoLoading(true);
                void loadUbigeos();
              }}>Reintentar</button>
            </div>}
            <label>Departamento
              <select required disabled={ubigeoLoading || Boolean(ubigeoError)} value={selectedDepartmentId} onChange={(event) => {
                const department = ubigeos.find((entry) => entry.id === event.target.value);
                if (!department) return;
                setDepartmentId(department.id);
                setProvinceId("");
                setDraft({
                  ...draft,
                  departamento: department.name,
                  provincia: "",
                  distrito: "",
                  idUbigeo: "",
                });
              }}>
                <option value="">Selecciona un departamento</option>
                {ubigeos.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              {ubigeoLoading && <small>Cargando catálogo UBIGEO…</small>}
            </label>
            <label>Provincia
              <select required disabled={!selectedDepartmentId || Boolean(ubigeoError)} value={selectedProvinceId} onChange={(event) => {
                const province = availableProvinces.find((entry) => entry.id === event.target.value);
                if (!province) return;
                setProvinceId(province.id);
                setDraft({
                  ...draft,
                  departamento: ubigeos.find((entry) => entry.id === selectedDepartmentId)?.name ?? "",
                  provincia: province.name,
                  distrito: "",
                  idUbigeo: "",
                });
              }}>
                <option value="">Selecciona una provincia</option>
                {availableProvinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
              </select>
            </label>
            <label>Distrito
              <select required disabled={!selectedProvinceId || Boolean(ubigeoError)} value={selectedDistrictId} onChange={(event) => {
                const district = availableDistricts.find((entry) => entry.id === event.target.value);
                if (!district) return;
                setDraft({
                  ...draft,
                  departamento: ubigeos.find((entry) => entry.id === selectedDepartmentId)?.name ?? "",
                  provincia: availableProvinces.find((entry) => entry.id === selectedProvinceId)?.name ?? "",
                  distrito: district.name,
                  idUbigeo: district.id,
                });
              }}>
                <option value="">Selecciona un distrito</option>
                {availableDistricts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </select>
            </label>
            <label>Dirección
              <input required maxLength={200} value={draft.direccion} onChange={(event) => setDraft({ ...draft, direccion: event.target.value })}/>
            </label>
            <label>Código postal
              <input required inputMode="numeric" pattern="[0-9]+" maxLength={10} value={draft.codigoPostal} onChange={(event) => setDraft({ ...draft, codigoPostal: event.target.value })}/>
            </label>
            <label>UBIGEO
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={draft.idUbigeo} readOnly title="UBIGEO del distrito seleccionado."/>
            </label>
            <label className="wide">Referencia
              <input required maxLength={250} value={draft.referencia} onChange={(event) => setDraft({ ...draft, referencia: event.target.value })}/>
            </label>
            {editingClient && <label className="wide category-active-field">
              <input type="checkbox" checked={draft.activo} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })}/>
              Cuenta activa
            </label>}
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : editingClient ? "Guardar cambios" : "Crear cliente"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}
