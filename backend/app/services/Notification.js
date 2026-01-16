class Notification {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    AddNotification(userId,name,message,type) {
        return new Promise((resolve, reject) => {
            
                 this.dbConnection('notification')
                    .insert({
                        userId,
                        name,
                        message,
                        type
                    });            
    
        });
    }    

    getNotification(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('notification')
            .select("embeddingId")
                .where({
                    userId
                })
                .then((id) => {
                    resolve(id)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    deleteNotification(id) {
        return new Promise((resolve, reject) => {
            this.dbConnection('notification')
            .delete()
                .where({
                    id
                })
                .then((id) => {
                    resolve(id)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }
}

module.exports = Notification