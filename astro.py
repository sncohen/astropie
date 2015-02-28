import logging
import datetime
import json
import cgi
import webapp2

from google.appengine.ext import db

class Astronaut(db.Model):
    uid = db.IntegerProperty()
    birthday = db.DateProperty()
    friendsBirthdays = db.ListProperty(db.Key)

class AddAstronaut(webapp2.RequestHandler):
    def post(self):
        try:
            jsonPayload = json.loads(self.request.body)

            uid = long(jsonPayload['uid'])
            birthday = datetime.datetime.strptime(jsonPayload['birthday'], "%m/%d/%Y").date()
            friends = jsonPayload['friends']

            friendKeyList = []

            for friend in friends:
                friendUID = long(friend['uid'])
                keyName = "fb%ld" % friendUID

                birthdayStr = friend['birthday']

                day = int(birthdayStr[3:5])
                mon = int(birthdayStr[0:2])
                year = datetime.MINYEAR

                if birthdayStr.count('/') > 2:
                    year = int(birthdayStr[6:10])

                birthdayDate = datetime.date(year, mon, day)

                friendKey = Astronaut.get_or_insert( keyName, uid = friendUID, birthday = birthdayDate )

                if friendKey == None:
                    logging.error("Failed to create friend key: %ld" % friendUID)
                    continue

                friendKeyList.append( friendKey )

            logging.info("friendKeyList: %d" % len(friendKeyList))

            keyName = "fb%ld" % uid
            Astronaut.get_or_insert( keyName, uid = uid, birthday = birthday, friends = friendKeyList )

            logging.info("New Astronaut: %ld/%s/%s" % (uid,birthday,json.dumps(friends)))

        except Exception, e: 
            logging.exception("AddAstronaut failed")
            self.error(500)
            return

        self.response.http_status_message(200)

app = webapp2.WSGIApplication([('/add', AddAstronaut)])

def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
