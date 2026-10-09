import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Needs a running Postgres with migrations applied: `docker compose up -d && pnpm db:migrate`.
describe('Contacts (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('round-trips a contact', async () => {
    const browser = request.agent(app.getHttpServer());

    const created = await browser
      .post('/contacts')
      .send({ firstName: 'Ada', lastName: 'Lovelace', phone: '+61 400 000 000' })
      .expect(201);

    expect(created.body).toMatchObject({ firstName: 'Ada', phone: '+61 400 000 000' });
    expect(created.body).not.toHaveProperty('ownerId');

    const { id } = created.body;

    await browser
      .patch(`/contacts/${id}`)
      .send({ phone: '+61 411 111 111' })
      .expect(200)
      .expect((res) => expect(res.body.phone).toBe('+61 411 111 111'));

    await browser.delete(`/contacts/${id}`).expect(204);
    await browser
      .get('/contacts')
      .expect(200)
      .expect((res) => expect(res.body.items.some((c: { id: string }) => c.id === id)).toBe(false));
  });

  it('bulk-deletes a selection, ignoring ids the caller does not own', async () => {
    const mine = request.agent(app.getHttpServer());
    const other = request.agent(app.getHttpServer());

    const ids: string[] = [];
    for (const firstName of ['Bulk A', 'Bulk B', 'Bulk C']) {
      const res = await mine
        .post('/contacts')
        .send({ firstName, lastName: 'Bulk', phone: '+61 444 444 444' })
        .expect(201);
      ids.push(res.body.id);
    }

    const [keep, dropA, dropB] = ids;
    const theirs = await other
      .post('/contacts')
      .send({ firstName: 'Theirs', lastName: 'Not Yours', phone: '+61 455 555 555' })
      .expect(201);

    await other.delete('/contacts').send({ ids: [dropA, theirs.body.id] }).expect(204);

    await other
      .get('/contacts')
      .expect(200)
      .expect((res) => expect(res.body.items).toEqual([]));
    await mine
      .get('/contacts')
      .expect(200)
      .expect((res) => expect(res.body.items.map((c: { id: string }) => c.id)).toHaveLength(3));

    await mine.delete('/contacts').send({ ids: [dropA, dropB] }).expect(204);
    await mine
      .get('/contacts')
      .expect(200)
      .expect((res) => expect(res.body.items.map((c: { id: string }) => c.id)).toEqual([keep]));

    // An empty selection is refused rather than read as "everything".
    await mine.delete('/contacts').send({ ids: [] }).expect(400);

    await mine.delete(`/contacts/${keep}`).expect(204);
  });

  it('pages through the book with a cursor', async () => {
    const browser = request.agent(app.getHttpServer());
    const created: string[] = [];

    for (const firstName of ['Alan', 'Grace', 'Katherine']) {
      const res = await browser
        .post('/contacts')
        .send({ firstName, lastName: 'Paged', phone: '+61 444 000 000' })
        .expect(201);
      created.push(res.body.id);
    }

    const first = await browser.get('/contacts?limit=2').expect(200);
    expect(first.body.total).toBe(3);
    expect(first.body.items.map((c: { firstName: string }) => c.firstName)).toEqual([
      'Alan',
      'Grace',
    ]);
    expect(first.body.nextCursor).toEqual(expect.any(String));

    const second = await browser
      .get(`/contacts?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`)
      .expect(200);
    expect(second.body.items.map((c: { firstName: string }) => c.firstName)).toEqual(['Katherine']);
    expect(second.body.nextCursor).toBeNull();

    await browser.get('/contacts?cursor=not-a-cursor').expect(400);
    await browser.get('/contacts?limit=0').expect(400);

    await browser.delete('/contacts').send({ ids: created }).expect(204);
  });

  it('searches names and numbers, and totals the whole match', async () => {
    const browser = request.agent(app.getHttpServer());
    const people = [
      { firstName: 'Ada', lastName: 'Lovelace', phone: '+61 400 111 222' },
      { firstName: 'Alan', lastName: 'Turing', phone: '+61 455 555 555' },
      { firstName: 'Grace', lastName: 'Hopper', phone: '+61 422 222 222' },
    ];
    const created: string[] = [];

    for (const person of people) {
      const res = await browser.post('/contacts').send(person).expect(201);
      created.push(res.body.id);
    }

    const names = (body: { items: { firstName: string }[] }) =>
      body.items.map((contact) => contact.firstName);

    // Word prefixes: "al" opens Alan, but opens neither word of Ada Lovelace.
    const first = await browser.get('/contacts?search=al').expect(200);
    expect(names(first.body)).toEqual(['Alan']);

    const last = await browser.get('/contacts?search=lov').expect(200);
    expect(names(last.body)).toEqual(['Ada']);
    expect(last.body.total).toBe(1);

    const words = await browser.get('/contacts?search=ada lov').expect(200);
    expect(names(words.body)).toEqual(['Ada']);

    const spread = await browser.get('/contacts?search=grace hop').expect(200);
    expect(names(spread.body)).toEqual(['Grace']);

    const digits = await browser.get('/contacts?search=422').expect(200);
    expect(names(digits.body)).toEqual(['Grace']);

    // "ace" sits inside Grace, but never opens a name word.
    const middle = await browser.get('/contacts?search=ace').expect(200);
    expect(names(middle.body)).toEqual([]);
    expect(middle.body.total).toBe(0);

    const all = await browser.get('/contacts').expect(200);
    expect(all.body.total).toBe(3);

    // The total counts the match, not the page.
    const paged = await browser.get('/contacts?limit=2').expect(200);
    expect(paged.body.items).toHaveLength(2);
    expect(paged.body.total).toBe(3);

    await browser.delete('/contacts').send({ ids: created }).expect(204);
  });

  it('keeps one browser out of another browser book', async () => {
    const mine = request.agent(app.getHttpServer());
    const other = request.agent(app.getHttpServer());

    const created = await mine
      .post('/contacts')
      .send({ firstName: 'Grace', lastName: 'Hopper', phone: '+61 422 222 222' })
      .expect(201);

    const { id } = created.body;

    await other
      .get('/contacts')
      .expect(200)
      .expect((res) => expect(res.body.items.some((c: { id: string }) => c.id === id)).toBe(false));

    await other.patch(`/contacts/${id}`).send({ phone: 'x' }).expect(404);
    await other.delete(`/contacts/${id}`).expect(404);

    await mine.delete(`/contacts/${id}`).expect(204);
  });
});
