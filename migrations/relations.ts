import { relations } from "drizzle-orm/relations";
import { prices, subscriptions, usersInAuth, workspaces, folders, files, users, customers, products } from "./schema";

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	price: one(prices, {
		fields: [subscriptions.priceId],
		references: [prices.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [subscriptions.userId],
		references: [usersInAuth.id]
	}),
}));

export const pricesRelations = relations(prices, ({one, many}) => ({
	subscriptions: many(subscriptions),
	product: one(products, {
		fields: [prices.productId],
		references: [products.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	subscriptions: many(subscriptions),
	users: many(users),
	customers: many(customers),
}));

export const foldersRelations = relations(folders, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [folders.workspaceId],
		references: [workspaces.id]
	}),
	files: many(files),
}));

export const workspacesRelations = relations(workspaces, ({many}) => ({
	folders: many(folders),
	files: many(files),
}));

export const filesRelations = relations(files, ({one}) => ({
	folder: one(folders, {
		fields: [files.folderId],
		references: [folders.id]
	}),
	workspace: one(workspaces, {
		fields: [files.workspaceId],
		references: [workspaces.id]
	}),
}));

export const usersRelations = relations(users, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [users.id],
		references: [usersInAuth.id]
	}),
}));

export const customersRelations = relations(customers, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [customers.id],
		references: [usersInAuth.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	prices: many(prices),
}));